import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database.service';
import { type User, type UserRepository } from '../user.repository';

@Injectable()
export class PgUserRepository implements UserRepository {
    constructor(private readonly db: DatabaseService) {}

    async upsertByWallet(walletAddress: string): Promise<User> {
        const { rows } = await this.db.query<User>(
            `insert into users (wallet_address) values ($1)
             on conflict (wallet_address) do update set wallet_address = excluded.wallet_address
             returning id, wallet_address, created_at`,
            [walletAddress],
        );

        return rows[0];
    }
}
