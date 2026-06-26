import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { MongoService } from './mongo.service';
import { USER_REPOSITORY } from './repositories/user.repository';
import { TRANSFER_REPOSITORY } from './repositories/transfer.repository';
import { PgUserRepository } from './repositories/pg/pg-user.repository';
import { PgTransferRepository } from './repositories/pg/pg-transfer.repository';
import { MongoUserRepository } from './repositories/mongo/mongo-user.repository';
import { MongoTransferRepository } from './repositories/mongo/mongo-transfer.repository';

export type DbDriver = 'postgres' | 'mongo';

@Global()
@Module({})
export class PersistenceModule {
    static forRoot(): DynamicModule {
        const driver: DbDriver = process.env.DB_DRIVER === 'mongo' ? 'mongo' : 'postgres';

        const providers: Provider[] =
            driver === 'mongo'
                ? [
                      MongoService,
                      { provide: USER_REPOSITORY, useClass: MongoUserRepository },
                      { provide: TRANSFER_REPOSITORY, useClass: MongoTransferRepository },
                  ]
                : [
                      DatabaseService,
                      { provide: USER_REPOSITORY, useClass: PgUserRepository },
                      { provide: TRANSFER_REPOSITORY, useClass: PgTransferRepository },
                  ];

        return {
            module: PersistenceModule,
            providers,
            exports: [USER_REPOSITORY, TRANSFER_REPOSITORY],
        };
    }
}
