import * as paginate from 'mongoose-paginate-v2';
import { Document, PaginateModel, Schema, model } from 'mongoose';

export const PackSchema = new Schema(
  {
    amount: Number,
    minAmount: Number,
    weight: Number,
    volume: Number,
    size: {
      x: Number,
      y: Number,
      z: Number,
    },
  },
  { _id: false },
);

export const PriceSchema = new Schema(
  {
    value: Number,
    type: { type: String },
  },
  { _id: false },
);

export const PrintSchema = new Schema(
  {
    name: String,
    description: String,
  },
  { _id: false },
);

export const StockSchema = new Schema(
  {
    total: Number,
    available: Number,
    inTransit: Number,
    inTransitAvailable: Number,
    dealerPrice: Number,
    endUserPrice: Number,
  },
  { _id: false },
);

export const ProductSchema = new Schema(
  {
    pid: { type: Number, unique: true },
    gid: { type: Number, index: true },
    code: { type: String, index: true },
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
    photos: [String],
    prints: [PrintSchema],
    variants: [{ type: Schema.Types.ObjectId, ref: 'Variant' }],
    category: { type: Schema.Types.ObjectId, ref: 'Category' },
  },
  {
    _id: false,
    versionKey: false,
  },
);

ProductSchema.plugin(paginate);
export const Product = model<any, PaginateModel<any>>('Product', ProductSchema);
