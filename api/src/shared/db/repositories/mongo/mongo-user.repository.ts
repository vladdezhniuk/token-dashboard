import { Injectable } from '@nestjs/common';
import { MongoService } from '../../mongo.service';
import { type User, type UserRepository } from '../user.repository';

interface UserDoc {
    wallet_address: string;
    created_at: Date;
}

@Injectable()
export class MongoUserRepository implements UserRepository {
    constructor(private readonly mongo: MongoService) {}

    async upsertByWallet(walletAddress: string): Promise<User> {
        const doc = await this.mongo.collection<UserDoc>('users').findOneAndUpdate(
            { wallet_address: walletAddress },
            { $setOnInsert: { wallet_address: walletAddress, created_at: new Date() } },
            { upsert: true, returnDocument: 'after' },
        );

        return {
            id: doc!._id.toString(),
            wallet_address: doc!.wallet_address,
            created_at: doc!.created_at,
        };
    }
}
