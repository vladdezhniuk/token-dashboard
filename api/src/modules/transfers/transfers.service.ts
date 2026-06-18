import { Injectable } from "@nestjs/common";
import { DatabaseService } from "src/shared/db/database.service";

export interface Transfer {
    id: string;
    address_from: string;
    address_to: string;
    amount: string;
    tx_hash: string;
    created_at: Date;
};

export type TransferDirection = 'sent' | 'received';

const COLUMN_BY_DIRECTION: Record<TransferDirection, string> = {
  sent: 'address_from',
  received: 'address_to',
};

@Injectable()
export class TransfersService {
    constructor (private db: DatabaseService){}
    public async getTransfers (address: string, direction?: string): Promise<Transfer[]> {
    const type  = direction?  COLUMN_BY_DIRECTION[direction] : '';

    const where = type
    ? `${type} = $1`
    : `address_from = $1 or address_to = $1`;
        const { rows } = await this.db.query<Transfer>(`select * from transfers
            where ${where}
            order by created_at desc`, [address]);

            return rows;
    };
}