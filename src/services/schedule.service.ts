import { setTimeout } from "timers/promises";

import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";

import { Item } from "../models/item.model";
import { Category } from "../models/category.model";
import { DownloadService } from "./download.service";

@Injectable()
export class ScheduleService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleService.name);

  private active = false;

  constructor(
    private readonly download: DownloadService,
  ) {}

  async onModuleInit() {
    if ((await Item.count()) === 0 || (await Category.count()) === 0) {
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
    await setTimeout(10000);
    await this.download.getProducts();
    await setTimeout(10000);
    await this.download.getPhotos();
    this.active = false;
  }
}