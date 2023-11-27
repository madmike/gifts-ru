import * as fs from "fs-extra";
import { lastValueFrom } from "rxjs";

import { setTimeout } from "timers/promises";
import { finished } from "stream/promises";

import { Mutex } from "async-mutex";
import { Cursor, Query, QueryOptions } from "mongoose";

import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";

const JOBS_LENGTH = 4;
const QUEUE_SIZE = 1000;

@Injectable()
export class PhotosService {
  private readonly logger = new Logger(PhotosService.name);

  private mutex = new Mutex();
  private jobs: Promise<void>[] = [];
  private queue: string[] = [];
  private cursor: Cursor<any, QueryOptions<any>>;
  private active = false;

  constructor(
    private readonly http: HttpService
  ) {}

  start(query: Query<any[], any>) {
    if (this.active) {
      return;
    }

    this.active = true;
    this.cursor = query.cursor();

    for (let i = 0; i < JOBS_LENGTH; i++) {
      this.logger.verbose(`Starting job #${i+1}...`);
      this.jobs.push(this.startJob(i+1));
    }

    return Promise.allSettled(this.jobs);
  }

  async loadQueue(): Promise<void> {
    let i = 0;

    return new Promise( async (resolve) => {
      while (this.active && this.queue.length < QUEUE_SIZE) {
        const item = await this.cursor.next();

        if (item) {
          this.queue.push(...item.photos.map( photo => photo.path ).filter(item => !!item));
        } else {
          this.active = false;
          break;
        }
      }

      resolve();
    } );
  }

  async getItem() {
    const locked = this.mutex.isLocked();
    const release = await this.mutex.acquire();

    try {
      if (!locked && this.queue.length === 0 && this.active) {
        await this.loadQueue()
      }
    } finally {
      release();
    }

    return this.queue.shift();
  }

  async startJob(num: Number, item = null) {
    item ||= await this.getItem();

    if (!item) {
      this.logger.debug(`Job ${num}: No more items, exiting...`)
      return Promise.resolve(null);
    }

    const baseUrl = `${process.env.GIFTS_PROTOCOL}://${process.env.GIFTS_USERNAME}:${process.env.GIFTS_PASSWORD}@${process.env.GIFTS_URL}/${process.env.GIFTS_EXPORT}`;
    const url = `${baseUrl}/thumbnails/${item}_1000x1000.jpg`;

    const file = `public/${item}.jpg`;
    if (await fs.exists(file)) {
      this.logger.debug(`Job ${num}: File exists ${file}, skipping...`);
      return this.startJob(num);
    }

    this.logger.debug(`Job ${num}: Downloading ${url}`);

    lastValueFrom(this.http.get(url, { responseType: 'stream' })).then( async (response) => {
      await fs.createFile(file);
      const writer = fs.createWriteStream(file);
      response.data.pipe(writer);
      await finished(writer);

      return this.startJob(num);
    }).catch( async (err) => {
      if (err?.response?.status === 429) {
        this.logger.warn(`Job ${num}: Too many connections, try again`);
        await setTimeout(1000 / JOBS_LENGTH);
        return this.startJob(num, item);
      } else {
        this.logger.error(`Job ${num}: Unexpected error '${err.message}', skipping`);
        return this.startJob(num);
      }
    });
  }
}