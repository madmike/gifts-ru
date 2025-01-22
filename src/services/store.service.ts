import { Mutex } from 'async-mutex';
import { ObjectId } from 'mongoose';
import { Injectable, Logger } from '@nestjs/common';

import { Category } from '../models/category.model';
import { MapperService } from './mapper.service';
import { Product } from 'src/models/product.model';
import { Variant } from 'src/models/variant.model';

const RING_SIZE = 1000;

@Injectable()
export class StoreService {
  private readonly logger = new Logger(StoreService.name);

  private products: any[] = [];
  private variants: any[] = [];

  private productCateogries = {};
  private categories = {};
  private mutex = new Mutex();

  constructor(private readonly mapper: MapperService) {}

  async addProduct(data: any = null): Promise<void> {
    return this.mutex.runExclusive(() => {
      if (data) {
        //размер|на рост|лет|года|см|XXS|XS|S|M|L|XL|2XL|3XL|4XL|5XL
        const { product, variants } = this.mapper.transform(data);
        this.products.push({
          updateOne: {
            filter: { pid: product.pid },
            update: { $set: product },
            upsert: true,
          },
        });

        variants?.forEach((variant) =>
          this.variants.push({
            updateOne: {
              filter: { pid: variant.pid },
              update: { $set: variant },
              upsert: true,
            },
          }),
        );
      }

      if (!data) {
        return this.storeProducts().then(() => this.storeVariants());
      }

      if (this.products.length >= RING_SIZE) {
        return this.storeProducts();
      }
      if (this.variants.length >= RING_SIZE) {
        return this.storeVariants();
      }

      return Promise.resolve();
    }) as Promise<void>;
  }

  async addProductStocks(data: any) {
    await this.mutex.runExclusive(async () => {
      if (data) {
        const product = this.mapper.transformStocks(data);
        this.products.push({
          updateOne: {
            filter: { pid: product.pid },
            update: { $set: { stocks: product.stocks } },
          },
        });
      }

      if (this.products.length >= RING_SIZE) {
        return this.storeVariants();
      } else {
        return Promise.resolve();
      }
    });
  }

  async createCategories(data: any[], parent: ObjectId = null) {
    return Promise.all(
      data.map((_category) => {
        return Category.findOneAndUpdate(
          { cid: _category.id },
          {
            ...(parent ? { parent } : {}),
            cid: _category.id,
            name: _category.name,
            slug: _category.uri,
          },
          { upsert: true, new: true },
        ).then((category) => {
          if (_category.children) {
            return this.createCategories(_category.children, category._id);
          }
        });
      }),
    );
  }

  async addCategory(cat: any) {
    return Category.findOneAndUpdate(
      {
        cid: parseInt(cat.page_id),
      },
      {
        cid: parseInt(cat.page_id),
        name: cat.name,
        slug: cat.uri,
      },
      {
        upsert: true,
        new: true,
      },
    ).then(async (category) => {
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

      if (cat.page_id in this.productCateogries) {
        try {
          await this.mutex.runExclusive(async () => {
            return Product.collection
              .bulkWrite(
                [...this.productCateogries[cat.page_id]].map((it) => ({
                  updateOne: {
                    filter: { pid: parseInt(it) },
                    update: {
                      $set: { pid: parseInt(it), category: category._id },
                    },
                    upsert: true,
                  },
                })),
              )
              .then(() => delete this.productCateogries[cat.id]);
          });
        } catch (error) {
          this.logger.error('ERROR HERE', error);
        }
      }
    });
  }

  async setProductCategory(product: any) {
    this.productCateogries[product.cid] ||= new Set();
    this.productCateogries[product.cid].add(product.pid);
  }

  // --------------------------

  private async storeProducts() {
    if (!this.products.length) {
      return Promise.resolve();
    }

    return Product.collection.bulkWrite(this.products).then((r) => {
      this.products.length = 0;
      global.gc && global.gc();
      return r;
    });
  }

  private async storeVariants() {
    if (!this.variants.length) {
      return Promise.resolve();
    }

    return Variant.collection.bulkWrite(this.variants).then((r) => {
      this.variants.length = 0;
      global.gc && global.gc();
      return r;
    });
  }
}
