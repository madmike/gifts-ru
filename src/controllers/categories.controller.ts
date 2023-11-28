import { Controller, Get, Param } from "@nestjs/common";
import { Category } from "../models/category.model";

@Controller()
export class CategoriesController {
  constructor() {}

  @Get('categories')
  tree() {
    return this.createTree();
  }

  @Get('categories/:id')
  async getCategory(@Param('id') id: string) {
    const param = /^[a-f\d]{24}$/i.test(id) ? '_id' : 'slug';
    const category = await Category.findOne({[param]: id});
    return this.createTree(category._id);
  }



  private async createTree(id: any = null) {
    //@ts-expect-error
    const tree = await Category.generateTreeMap();

    if (id) {
      return tree[id];
    } 

    for (let cat in tree) {
      if (tree[cat].parent) {
        delete tree[cat];
      }
    }

    return Object.values(tree);
  }
}
