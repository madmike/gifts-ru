import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { Category } from '../models/category.model';
import { Product } from '../models/product.model';
import { DownloadService } from './download.service';

@Injectable()
export class ScheduleService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleService.name);

  private active = false;

  constructor(private readonly download: DownloadService) {}

  async onModuleInit() {
    if ((await Product.count()) === 0 || (await Category.count()) === 0) {
      this.handleCron();
    }
  }

  @Cron('0 0 2 * * *')
  async handleCron() {
    if (this.active) {
      return;
    }

    this.active = true;
    await this.download.getCategories();
    await this.download.getProducts();
    await this.download.getStocks();
    await this.download.getPhotos();
    this.active = false;
  }
}
