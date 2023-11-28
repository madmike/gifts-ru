import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";

import { ScheduleService } from "./services/schedule.service";
import { DatabaseModule } from "./services/database.module";
import { DownloadService } from "./services/download.service";
import { MapperService } from "./services/mapper.service";
import { StoreService } from "./services/store.service";
import { PhotosService } from "./services/photos.service";

import { CategoriesController } from "./controllers/categories.controller";
import { ItemsController } from "./controllers/items.controller";

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule.forRoot(),
    HttpModule,

    DatabaseModule,
  ],
  controllers: [
    CategoriesController,
    ItemsController,
  ],
  providers: [
    ScheduleService,
    DownloadService,
    MapperService,
    StoreService,
    PhotosService,
  ],
})
export class AppModule {}
