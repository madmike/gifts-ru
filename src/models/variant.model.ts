import * as paginate from 'mongoose-paginate-v2';
import { PaginateModel, Schema, model } from 'mongoose';
import { PriceSchema, StockSchema } from './product.model';

export const VariantSchema = new Schema({
  mid: { type: Number, index: true }, // main product id
  pid: { type: Number, unique: true }, // variant id
  code: { type: String, index: true },
  price: PriceSchema,
  stocks: StockSchema,
  size: String,
  category: { type: Schema.Types.ObjectId, ref: 'Category' },
});

VariantSchema.plugin(paginate);
export const Variant = model<any, PaginateModel<any>>('Variant', VariantSchema);
