import { Injectable } from "@nestjs/common";

@Injectable()
export class MapperService {
  constructor() {}

  transform(data: any) {
    return {
      pid: data.product_id?.$text,
      gid: data.group?.$text,
      code: data.code?.$text,
      barcode: data.barcode?.$text,
      name: data.name?.$text,
      brand: data.brand?.$text,
      size: data.product_size?.$text,
      weight: data.weight?.$text,
      volume: data.volume?.$text,
      matherial: data.matherial?.$text,
      content: data.content?.$text,
      status: data.status?.$id,
      ...(data.price ? { price: this.transformPrice(data.price) } : {}),
      ...(data.pack ? { pack: this.transformPack(data.pack) } : {}),
      ...(data.print ? { prints: [...(Array.isArray(data.print) ? data.print : [data.print])].map( p => ({ name: p.name?.$text, description: p.description?.$text }) ).filter( p => p.name && p.description ) } : {}),
      ...(data.product_attachment && data.product_attachment.length ? { photos: data.product_attachment.map( a => this.transformPhoto(a) ) } : {}),
      ...(data.product && data.product.length ? { variants: data.product.map( p => this.transform(p) ) } : {}),
    }
  }

  private transformPrice(data: any) {
    return {
      value: data?.price?.$text,
      type: data?.name?.$text
    }
  }

  private transformPack(data: any) {
    return {
      amount: data?.amount?.$text,
      minamount: data?.minpackamount?.$text,
      weight: data?.weight?.$text,
      volume: data?.volume?.$text,
      size: {
        x: data?.sizex?.$text,
        y: data?.sizey?.$text,
        z: data?.sizez?.$text,
      },
    }
  }

  private transformPhoto(data: any) {
    return (data.meaning.$text === 1)
      ? { path: data.image?.$text?.replace(/thumbnails\/(.+?)_1000x1000.jpg/, '$1') }
      : {}
  }
}