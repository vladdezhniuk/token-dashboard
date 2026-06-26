import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Db, MongoClient, type Collection, type Document } from 'mongodb';

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly client: MongoClient;
  private readonly db: Db;

  constructor(config: ConfigService) {
    this.client = new MongoClient(config.getOrThrow<string>('MONGO_URL'));
    this.db = this.client.db(); // database name is taken from the connection string
  }

  async onModuleInit() {
    await this.client.connect();
  }

  collection<T extends Document = Document>(name: string): Collection<T> {
    return this.db.collection<T>(name);
  }

  async onModuleDestroy() {
    await this.client.close();
  }
}
