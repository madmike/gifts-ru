import mongoose from 'mongoose';
import { Module } from '@nestjs/common';

const databaseProviders = [
  {
    provide: 'DB',
    useFactory: (): Promise<typeof mongoose> => {
      const creds = (process.env.DB_USER && process.env.DB_PASSWORD)
        ? `${process.env.DB_USER}:${process.env.DB_PASSWORD}@`
        : '';
      const host = (process.env.DB_HOST || 'localhost')
        + (process.env.DB_PORT ? `:${process.env.DB_PORT}` : '');
      const url = `mongodb://${creds}${host}/${process.env.DB_NAME}?authSource=admin`;
      return mongoose.connect(url, { maxPoolSize: 5 });
    }
  },
];

@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}