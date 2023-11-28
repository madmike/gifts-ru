import { Controller, Get, Logger, Param, Query } from "@nestjs/common";
import { Category } from "../models/category.model";
import { Item } from "../models/item.model";


@Controller()
export class ItemsController {
  private readonly logger = new Logger(ItemsController.name);
  constructor() {}

  @Get('items')
  index(@Query() q) {
    const { where, options } = this.getQuery(q);
    return Item.paginate(where, options);
  }

  @Get('categories/:cat_id/items')
  async getItemsForCategory(@Param('cat_id') cat_id: string, @Query() q) {
    const param = /^[a-f\d]{24}$/i.test(cat_id) ? '_id' : 'slug';
    const cat = await Category.findOne({ [param]: cat_id });
    const catIds = await cat.getDescedants();
    const { where, options } = this.getQuery(q);
    console.log(catIds)
    if (cat) {
      where.category = {$in: catIds };
    }

    return Item.paginate(where, options);
  }

  @Get('items/:item_id')
  async getItem(@Param('item_id') item_id: string, @Query() q) {
    return Item.findById(item_id);
  }

  private getQuery(q: any) {
    let where: any = {};
    let sort: any = {};

    if (q.where) {
      try {
        where = JSON.parse(q.where);
      } catch(error) {
        this.logger.warn('Error in where params', error);
      }
    }

    if (q.sort) {
      try {
        sort = JSON.parse(q.sort);
      } catch(error) {
        this.logger.warn('Error in sort params', error);
      }
    }

    return {
      where,
      options: {
        page: parseInt(q.page || 1),
        limit: parseInt(q.limit || 15),
        sort,
      }
    };
  }
}