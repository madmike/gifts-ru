import { ProductEvents } from 'src/enums/product-events.enum';
import { SaxStream } from './sax-stream';

export class ProductParser extends SaxStream {
  private block: any = {};
  private arr: any = [this.block];
  private counter = 0;

  constructor() {
    super();

    this.on('opentag', (name: string, attrs) => {
      if (name === 'doct') {
        return;
      }

      const cur = {};
      const ptr = this.arr[this.arr.length - 1];
      if (name in ptr) {
        if (!Array.isArray(ptr[name])) {
          ptr[name] = [ptr[name]];
        }
        ptr[name].push(cur);
        this.arr.push(ptr[name][ptr[name].length - 1]);
      } else {
        ptr[name] = cur;
        this.arr.push(ptr[name]);
      }

      if (attrs) {
        for (const i of Object.entries(attrs)) {
          cur[`$${i[0]}`] = i[1];
        }
      }
    });

    this.on('text', (data) => {
      const ptr = this.arr[this.arr.length - 1];
      const str = data.trim();

      if (str) {
        // if (/^[\d.]+$/.test(str)) {
        //   str = parseFloat(str);
        // }
        ptr.$text = str;
      }
    });

    this.on('closetag', async (name) => {
      if (name === 'doct') {
        return;
      }

      if (this.arr.length > 2) {
        this.arr.pop();
      } else {
        this.counter++;

        if (this.block.product) {
          this.emit(ProductEvents.PRODUCT, this.block.product);
        }

        this.arr = null;
        this.block = null;

        this.block = {};
        this.arr = [this.block];
      }
    });
  }
}
