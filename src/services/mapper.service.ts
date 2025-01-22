import * as he from 'he';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MapperService {
  constructor() {}

  transform(data: any) {
    const product = {
      pid: parseInt(data.product_id?.$text),
      gid: parseInt(data.group?.$text),
      code: data.code?.$text,
      name: data.name?.$text,
      brand: data.brand?.$text,
      size: data.product_size?.$text,
      weight: parseFloat(data.weight?.$text),
      volume: parseFloat(data.volume?.$text),
      matherial: data.matherial?.$text,
      content: data.content?.$text ? he.decode(data.content?.$text) : undefined,
      status: parseInt(data.status?.$id),
      ...(data.price ? { price: this.transformPrice(data.price) } : {}),
      ...(data.pack ? { pack: this.transformPack(data.pack) } : {}),
      ...(data.print ? { prints: this.transformPrints(data.print) } : {}),
      ...(data.product_attachment && data.product_attachment.length
        ? {
            photos: data.product_attachment
              .map((a) => this.transformPhoto(a))
              .filter((p) => !!p),
          }
        : {}),
    };

    for (const key in product) {
      if (product[key] !== 0 && !product[key]) {
        delete product[key];
      }
    }

    if (data.product && !Array.isArray(data.product)) {
      data.product = [data.product];
    }
    const variants = data.product?.map((v) => this.transformVariant(v));

    return { product, variants };
  }

  private transformVariant(data: any) {
    return {
      mid: parseInt(data.main_product?.$text),
      pid: parseInt(data.product_id?.$text),
      code: data.code?.$text,
      name: data.name?.$text,
      barcode: data.barcode?.$text,
      size: data.size_code?.$text,
      weight: parseFloat(data.weight?.$text),
      ...(data.price ? { price: this.transformPrice(data.price) } : {}),
    };
  }

  transformStocks(data: any) {
    return {
      pid: parseInt(data.product_id),
      code: data.code,
      stocks: {
        total: parseInt(data.amount),
        available: parseInt(data.free),
        transit: parseInt(data.inwayamount),
        transitAvailable: parseInt(data.inwayfree),
        dealerPrice: parseFloat(data.dealerprice),
        endUserPrice: parseFloat(data.enduserprice),
      },
    };
  }

  private transformPrice(data: any) {
    return {
      value: parseFloat(data?.price?.$text),
      type: data?.name?.$text,
    };
  }

  private transformPack(data: any) {
    return {
      amount: parseInt(data?.amount?.$text),
      minAmount: parseInt(data?.minpackamount?.$text),
      weight: parseFloat(data?.weight?.$text),
      volume: parseFloat(data?.volume?.$text),
      size: {
        x: parseFloat(data?.sizex?.$text),
        y: parseFloat(data?.sizey?.$text),
        z: parseFloat(data?.sizez?.$text),
      },
    };
  }

  private transformPrints(data: any) {
    const prints = Array.isArray(data) ? data : [data];
    return prints
      .map((p) => {
        return {
          name: p.name?.$text,
          description: p.description?.$text,
        };
      })
      .filter((p) => p.name && p.description);
  }

  private transformPhoto(data: any) {
    return data.meaning.$text === '1'
      ? data.image?.$text?.replace(/thumbnails\/(.+?)_1000x1000.jpg/, '$1')
      : null;
  }
}
