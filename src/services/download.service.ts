import { lastValueFrom } from "rxjs";
import { finished } from "stream/promises";

import { HttpService } from "@nestjs/axios";
import { Injectable, Logger } from "@nestjs/common";

import { StoreService } from "./store.service";
import { Item } from "../models/item.model";
import { PhotosService } from "./photos.service";
import { ProductParser } from "../classes/products-parser.class";
import { SaxEvents } from "../enums/events.enum";
import { ProductEvents } from "../enums/product-events.enum";
import { CategoryParser } from "../classes/category-parser.class";
import { StockParser } from "../classes/stock-parser.class";

@Injectable()
export class DownloadService {
  private readonly logger = new Logger(DownloadService.name);

  private productParser = new ProductParser();
  private categoryParser = new CategoryParser();
  private stocksParser = new StockParser();

  constructor(
    private readonly http: HttpService,
    
    private readonly store: StoreService,
    private readonly photos: PhotosService,
  ) {
    this.productParser.on(ProductEvents.PRODUCT, (data => {
      this.store.addItem(data);
    }));

    this.categoryParser.on(ProductEvents.CATEGORY, (async (category) => {
      this.store.addCategory(category);
    }));

    this.categoryParser.on(ProductEvents.PRODUCT_CATEGORY, ( async (data) => {
      this.store.setItemCategory(data)
    }));

    this.stocksParser.on(ProductEvents.STOCK, (async (data) => {
      this.store.addItemStocks(data);
    }));
  }

  async getCategories() {
    const baseUrl = `${process.env.GIFTS_PROTOCOL}://${process.env.GIFTS_USERNAME}:${process.env.GIFTS_PASSWORD}@${process.env.GIFTS_URL}/${process.env.GIFTS_EXPORT}`;
    const url = `${baseUrl}/${process.env.GIFTS_TREE_PATH}`;

    this.logger.log('Start downloading categories', url);

    lastValueFrom(this.http.get(url, { responseType: 'stream' })).then( res => res.data.pipe(this.categoryParser) );
    return new Promise<void>(resolve => {
      this.categoryParser.on(SaxEvents.FINISH, (() => {
        this.logger.log('Finished downloading categories...');
        resolve();
      }));
    })
  }

  async getProducts() {
    const baseUrl = `${process.env.GIFTS_PROTOCOL}://${process.env.GIFTS_USERNAME}:${process.env.GIFTS_PASSWORD}@${process.env.GIFTS_URL}/${process.env.GIFTS_EXPORT}`;
    const url = `${baseUrl}/${process.env.GIFTS_CATALOGUE_PATH}`;

    this.logger.log('Start downloading products', url);

    lastValueFrom(this.http.get(url, { responseType: 'stream'})).then( res => res.data.pipe(this.productParser) );
    
    return new Promise<void>(resolve => {
      this.productParser.on(SaxEvents.FINISH, async () => {
        this.store.addItem().then(()=> {
          this.logger.log('Finished downloading products...');
          resolve();
        });
      });
    });
  }

  async getStocks() {
    const baseUrl = `${process.env.GIFTS_PROTOCOL}://${process.env.GIFTS_USERNAME}:${process.env.GIFTS_PASSWORD}@${process.env.GIFTS_URL}/${process.env.GIFTS_EXPORT}`;
    const url = `${baseUrl}/${process.env.GIFTS_STOCKS_PATH}`;

    this.logger.log('Start downloading stocks', url);

    lastValueFrom(this.http.get(url, { responseType: 'stream'})).then( res => res.data.pipe(this.stocksParser) );
    
    return new Promise<void>(resolve => {
      this.stocksParser.on(SaxEvents.FINISH, (async () => {
        this.store.addItem().then(() => {
          this.logger.log('Finished downloading stocks...');
          resolve();
        });
      }));
    });
  }

  async getPhotos() {
    const items = Item.find({ photos: { $ne: null }});
    return this.photos.start(items);
  }
}