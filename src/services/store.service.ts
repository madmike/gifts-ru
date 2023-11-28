import { Mutex } from "async-mutex";
import { ObjectId } from "bson";
import { Injectable, Logger } from "@nestjs/common";

import { Item } from "../models/item.model";
import { Category } from "../models/category.model";
import { MapperService } from "./mapper.service";

const RING_SIZE = 1000;

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  private items: any[] = [];

  private itemCateogries = {};
  private categories = {};
  private mutex = new Mutex();

  constructor(
    private readonly mapper: MapperService,
  ) {}

  async addItem(data: any = null) {
    return this.mutex.runExclusive(() => {
      if (data) {
        const item = this.mapper.transform(data);
        this.items.push({
          updateOne: {
            filter: { pid: item.pid },
            update: { $set: item },
            upsert: true,
          }
        });
      }

      if (!data || this.items.length === RING_SIZE) {
        return this.storeItems();
      } else {
        return Promise.resolve();
      }
    });
  }

  async addItemStocks(data: any) {
    await this.mutex.runExclusive(async () => {
      if (data) {
        const item = this.mapper.transformStocks(data);
        this.items.push({
          updateOne: {
            filter: { pid: item.pid },
            update: { $set: { stocks: item.stocks } },
            upsert: true,
          }
        });
      }

      if (this.items.length === RING_SIZE) {
        return this.storeItems();
      } else {
        return Promise.resolve();
      }
    });
  }

  async createCategories(data: any[], parent: ObjectId = null) {
    return Promise.all(data.map( _category => {
      return Category.findOneAndUpdate({cid: _category.id}, {
        ...(parent ? { parent } : {}),
        cid: _category.id,
        name: _category.name,
        slug: _category.uri,
      }, { upsert: true, new: true}).then( category => {
        if (_category.children) {
          return this.createCategories(_category.children, category._id);
        }
      })
    } ));
  }

  async addCategory(cat: any) {
    return Category.findOneAndUpdate({
      cid: parseInt(cat.page_id)
    }, {
      cid: parseInt(cat.page_id),
      name: cat.name,
      slug: cat.uri
    }, {
      upsert: true,
      new: true
    }).then( async (category) => {
      if (cat.parent_id) {
        this.categories[cat.parent_id] ||= [];
        this.categories[cat.parent_id].push(category._id);
      }

      if (parseInt(cat.page_id) in this.categories) {
        await Category.updateMany(
          { _id: { $in: this.categories[cat.page_id] } },
          { $set: { parent: category._id } },
        );
      }

      if (cat.page_id in this.itemCateogries) {
        try{
          await this.mutex.runExclusive(async () => {
            return Item.collection.bulkWrite([...this.itemCateogries[cat.page_id]].map( it => ({
              updateOne: {
                filter: { pid: parseInt(it) },
                update: { $set: { pid: parseInt(it), category: category._id } },
                upsert: true
              }
            }))).then( () => delete this.itemCateogries[cat.id] );
          });
        } catch(error) {
          this.logger.error('ERROR HERE', error)
        }
      }
    });
  }

  async setItemCategory(item: any) {
    this.itemCateogries[item.cid] ||= new Set();
    this.itemCateogries[item.cid].add(item.pid);
  }

  // --------------------------

  private async storeItems() {
    if (!this.items.length) {
      return Promise.resolve();
    }

    return Item.collection.bulkWrite(this.items).then( r => {
      this.items.length = 0;
      global.gc && global.gc();
      return r;
    } );
  }
}