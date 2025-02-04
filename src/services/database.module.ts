import mongoose from 'mongoose';
import { Module } from '@nestjs/common';

const constructMongoURI = (envVars: any) => {
  let uri = 'mongodb://';

  if (envVars.DB_USER && envVars.DB_PASSWORD) {
    uri += `${encodeURIComponent(envVars.DB_USER)}:${encodeURIComponent(envVars.DB_PASSWORD)}@`;
  }

  uri += `${envVars.DB_HOST || 'localhost'}:${envVars.DB_PORT || 27017}/${envVars.DB_NAME || 'merch'}`;

  const queryParams: string[] = [
    `authSource=${encodeURIComponent(envVars.MONGO_AUTH_SOURCE || 'admin')}`,
  ];
  if (envVars.MONGO_TLS === 'true') {
    queryParams.push('ssl=true');
  }

  if (queryParams.length > 0) {
    uri += `?${queryParams.join('&')}`;
  }

  return uri;
};

const databaseProviders = [
  {
    provide: 'DB',
    useFactory: (): Promise<typeof mongoose> => {
      const url = constructMongoURI(process.env);
      return mongoose.connect(url, { maxPoolSize: 5 });
    },
  },
];

@Module({
  providers: [...databaseProviders],
  exports: [...databaseProviders],
})
export class DatabaseModule {}
