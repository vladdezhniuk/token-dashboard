import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database.service';
import {
    type NewTransfer,
    type Transfer,
    type TransferDirection,
    type TransferRepository,
} from '../transfer.repository';

const COLUMN_BY_DIRECTION: Record<TransferDirection, string> = {
    sent: 'address_from',
    received: 'address_to',
};

@Injectable()
export class PgTransferRepository implements TransferRepository {
    constructor(private readonly db: DatabaseService) {}

    async findByAddress(address: string, direction?: TransferDirection): Promise<Transfer[]> {
        const column = direction ? COLUMN_BY_DIRECTION[direction] : '';
        const where = column ? `${column} = $1` : `address_from = $1 or address_to = $1`;

        const { rows } = await this.db.query<Transfer>(
            `select id, address_from, address_to, amount, tx_hash, created_at
               from transfers
              where ${where}
              order by created_at desc`,
            [address],
        );

        return rows;
    }

    async insert(transfer: NewTransfer ): Promise<void> {
        const {address_from, address_to, amount, tx_hash, log_index} = transfer;

        await this.db.query(
            `insert into transfers (address_from, address_to, amount, tx_hash, log_index)
             values ($1, $2, $3, $4, $5)
             on conflict (tx_hash, log_index) do nothing`,
            [address_from, address_to, amount, tx_hash, log_index],
        );
    }
}
