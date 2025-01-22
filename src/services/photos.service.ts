import * as fs from 'fs-extra';
import { lastValueFrom } from 'rxjs';

import { setTimeout } from 'timers/promises';
import { finished } from 'stream/promises';

import { Mutex } from 'async-mutex';
import { Cursor, Query, QueryOptions } from 'mongoose';

import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';

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

  constructor(private readonly http: HttpService) {}

  start(query: Query<any[], any>) {
    if (this.active) {
      return;
    }

    this.active = true;
    this.cursor = query.cursor();

    for (let i = 0; i < JOBS_LENGTH; i++) {
      this.logger.verbose(`Starting job #${i + 1}...`);
      this.jobs.push(this.startJob(i + 1));
    }

    return Promise.allSettled(this.jobs);
  }

  async loadQueue(): Promise<void> {
    return new Promise(async (resolve) => {
      while (this.active && this.queue.length < QUEUE_SIZE) {
        const product = await this.cursor.next();

        if (product && product.photos) {
          this.queue.push(...product.photos.filter((photo) => !!photo));
        } else {
          this.active = false;
          break;
        }
      }

      resolve();
    });
  }

  async getProduct() {
    const locked = this.mutex.isLocked();
    const release = await this.mutex.acquire();

    try {
      if (!locked && this.queue.length === 0 && this.active) {
        await this.loadQueue();
      }
    } finally {
      release();
    }

    return this.queue.shift();
  }

  async startJob(num: number, product = null) {
    product ||= await this.getProduct();

    if (!product) {
      this.logger.debug(`Job ${num}: No more products, exiting...`);
      return Promise.resolve(null);
    }

    const baseUrl = `${process.env.GIFTS_PROTOCOL}://${process.env.GIFTS_USERNAME}:${process.env.GIFTS_PASSWORD}@${process.env.GIFTS_URL}/${process.env.GIFTS_EXPORT}`;
    const url = `${baseUrl}/thumbnails/${product}_1000x1000.jpg`;

    const file = `public/${product}.jpg`;
    if (await fs.exists(file)) {
      this.logger.debug(`Job ${num}: File exists ${file}, skipping...`);
      return this.startJob(num);
    }

    this.logger.debug(`Job ${num}: Downloading ${url}`);

    lastValueFrom(this.http.get(url, { responseType: 'stream' }))
      .then(async (response) => {
        await fs.createFile(file);
        const writer = fs.createWriteStream(file);
        response.data.pipe(writer);
        await finished(writer);

        return this.startJob(num);
      })
      .catch(async (err) => {
        if (err?.response?.status === 429) {
          this.logger.warn(`Job ${num}: Too many connections, try again`);
          await setTimeout(1000 / JOBS_LENGTH);
          return this.startJob(num, product);
        } else {
          this.logger.error(
            `Job ${num}: Unexpected error '${err.message}', skipping`,
          );
          return this.startJob(num);
        }
      });
  }
}
