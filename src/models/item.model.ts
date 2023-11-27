import * as paginate from "mongoose-paginate-v2";
import { Document, PaginateModel, Schema, model } from "mongoose";


export const PackSchema = new Schema({
  amount: Number,
  minamount: Number,
  weight: Number,
  volume: Number,
  size: {
    x: Number,
    y: Number,
    z: Number,
  },
}, { _id : false });

export const PriceSchema = new Schema({
  value: Number,
  type: { type: String },
}, { _id : false });

export const PrintSchema = new Schema({
  name: String,
  description: String,
}, { _id : false });

export const PhotoSchema = new Schema({
  path: String,
});

export const ItemSchema = new Schema({
  pid: { type: Number, unique: true },
  gid: { type: Number, index: true },
  code: { type: String, index: true },
  barcode: String,
  name: String,
  brand: String,
  size: String,
  weight: Number,
  volume: Number,
  matherial: String,
  content: String,
  status: Number,
  price: PriceSchema,
  pack: PackSchema,
  prints: [PrintSchema],
  photos: [PhotoSchema],
  variants: ['ItemSchema'],

  category: { type: Schema.Types.ObjectId, ref: 'Category' },
}, {
  versionKey: false
});
ItemSchema.plugin(paginate);

export const Item = model<any, PaginateModel<any>>('Item', ItemSchema);