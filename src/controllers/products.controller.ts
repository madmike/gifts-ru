import { Controller, Get, Logger, Param, Query } from '@nestjs/common';
import { Category } from '../models/category.model';
import { Product } from '../models/product.model';

@Controller()
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  constructor() {}

  @Get('products')
  index(@Query() q) {
    const { where, options } = this.getQuery(q);
    return Product.paginate(where, options);
  }

  @Get('categories/:cat_id/products')
  async getProductsForCategory(@Param('cat_id') cat_id: string, @Query() q) {
    const param = /^[a-f\d]{24}$/i.test(cat_id) ? '_id' : 'slug';
    const cat = await Category.findOne({ [param]: cat_id });
    const catIds = await cat.getDescedants();
    const { where, options } = this.getQuery(q);

    if (cat) {
      where.category = { $in: catIds };
    }

    return Product.paginate(where, options);
  }

  @Get('products/:id')
  async getProduct(@Param('id') id: string) {
    return Product.findById(id);
  }

  @Get('products/:id/similar')
  async getSimilar(@Param('id') id: string, @Query() q) {
    const product = await Product.findById(id);

    if (product) {
      const { where, options } = this.getQuery(q);
      where.gid = product.gid;
      return Product.paginate({ gid: product.gid }, options);
    }

    return [];
  }

  private getQuery(q: any) {
    let where: any = {};
    let sort: any = {};

    if (q.where) {
      try {
        where = JSON.parse(q.where);
      } catch (error) {
        this.logger.warn('Error in where params', error);
      }
    }

    if (q.sort) {
      try {
        sort = JSON.parse(q.sort);
      } catch (error) {
        this.logger.warn('Error in sort params', error);
      }
    }

    return {
      where,
      options: {
        page: parseInt(q.page || 1),
        limit: parseInt(q.limit || 16),
        sort,
      },
    };
  }
}
