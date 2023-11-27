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
    const categories = await Category.find();

    const tree = {};
    for (let category of categories) {
      tree[category._id] ||= {};
      tree[category._id] = { ...tree[category._id], ...category.toObject() };

      if (category.parent) {
        tree[category.parent] ||= {};
        tree[category.parent].children ||= [];
        tree[category.parent].children.push(tree[category._id]);
      }
    }

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
