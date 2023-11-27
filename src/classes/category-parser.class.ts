import { inspect } from "util";
import { SaxStream } from "./sax-stream";
import { EVENTS } from "src/enums/events.enum";
import { ProductEvents } from "src/enums/product-events.enum";

export class CategoryParser extends SaxStream {
  private categories: any[] = [];
  private tag = '';
  private product = 0;


  constructor() {
    super();

    this.on('opentag', (name: string, attrs) => {
      if (name === 'product') {
        this.product++;
      }

      if (name === 'page' && this.product === 0) {
        this.categories.push({
          parent_id: attrs.parent_page_id
            ? attrs.parent_page_id
            : null
          });
      }

      this.tag = name;
    });

    this.on('text', data => {
      if (['page_id', 'name', 'uri'].includes(this.tag)) {
        this.categories.slice(-1)[0][this.tag] = data.trim();
      } else if (this.tag === 'product' && this.product === 2) {
        this.emit(ProductEvents.PRODUCT_CATEGORY, {
          cid: parseInt(this.categories.slice(-1)[0].page_id),
          pid: parseInt(data)
        });
      }
    });

    this.on('closetag', async (name) => {
      if (name === 'page' && this.product === 0) {
        const cat = this.categories.pop()
        if (cat.page_id !== '1' && Object.keys(cat)) {
          if (cat.parent_id === '1') {
            delete cat.parent_id;
          }

          this.emit(ProductEvents.CATEGORY, cat);
        }
      } else if (name === 'product') {
        this.product--;
      }
    });

    // this.on('finish', () => {
    //   this.emit(ProductEvents.CATEGORY_LIST, this.block.children[0].children);
    //   //console.log(inspect(this.block, {colors: true, depth: null}));
    // })
  }
}