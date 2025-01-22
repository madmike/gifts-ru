import { Schema, model } from 'mongoose';

export const CategorySchema = new Schema<any>(
  {
    parent: { type: Schema.Types.ObjectId, ref: 'Category' },
    name: String,
    cid: { type: String, unique: true },
    slug: { type: String, unique: true },
  },
  {
    versionKey: false,
    timestamps: true,

    methods: {
      async getDescedants() {
        //@ts-expect-error fuck typescript
        const map = await Category.generateTreeMap();
        const self = map[this._id];

        const ids = [this._id];
        const getChildIds = (children) => {
          for (const child of children) {
            ids.push(child._id);

            if (child.children) {
              getChildIds(child.children);
            }
          }
        };

        getChildIds(self.children || []);

        return ids;
      },
    },

    statics: {
      async generateTreeMap() {
        const categories = await Category.find();

        const map = {};
        for (const category of categories) {
          map[category._id] ||= {};
          map[category._id] = { ...map[category._id], ...category.toObject() };

          if (category.parent) {
            map[category.parent] ||= {};
            map[category.parent].children ||= [];
            map[category.parent].children.push(map[category._id]);
          }
        }

        return map;
      },
    },
  },
);

export const Category = model<any>('Category', CategorySchema);
