import { ProductEvents } from "../enums/product-events.enum";

import { SaxStream } from "./sax-stream";

export class StockParser extends SaxStream {
  private process = false;
  private block = {};
  private tag = '';

  constructor() {
    super();

    this.on('opentag', (name: string, attrs) => {
      if (name === 'doct') {
        return;
      }

      if (name === 'stock') {
        this.process = true;
        return;
      }

      this.tag = name;
    });

    this.on('text', data => {
      this.block[this.tag] = data.trim();
    });

    this.on('closetag', async (name) => {
      if (name === 'stock') {
        this.emit(ProductEvents.STOCK, this.block);
        this.block = {};
        this.tag = '';
      }
    });
  }
}