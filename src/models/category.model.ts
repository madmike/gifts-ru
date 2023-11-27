import { Schema, model } from 'mongoose';

export const CategorySchema = new Schema({
  parent: { type: Schema.Types.ObjectId, ref: 'Category' },
  name: String,
  cid: { type: String, unique: true },
  slug: { type: String, unique: true },
}, {
  versionKey: false,
  timestamps: true,
});

export const Category = model<any>('Category', CategorySchema);