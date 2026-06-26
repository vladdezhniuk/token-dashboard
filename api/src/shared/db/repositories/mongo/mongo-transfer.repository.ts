import { Injectable } from '@nestjs/common';
import { type Filter } from 'mongodb';
import { MongoService } from '../../mongo.service';
import {
    type NewTransfer,
    type Transfer,
    type TransferDirection,
    type TransferRepository,
} from '../transfer.repository';

interface TransferDoc {
    address_from: string;
    address_to: string;
    amount: string;
    tx_hash: string;
    log_index: number;
    created_at: Date;
}

@Injectable()
export class MongoTransferRepository implements TransferRepository {
    constructor(private readonly mongo: MongoService) {}

    async findByAddress(address: string, direction?: TransferDirection): Promise<Transfer[]> {
        const filter: Filter<TransferDoc> =
            direction === 'sent'
                ? { address_from: address }
                : direction === 'received'
                  ? { address_to: address }
                  : { $or: [{ address_from: address }, { address_to: address }] };

        const transfers = await this.mongo
            .collection<TransferDoc>('transfers')
            .find(filter)
            .sort({ created_at: -1 })
            .toArray();

        return transfers.map((transfer) => ({...transfer, id: transfer._id.toString()}));
    }

    async insert(transfer: NewTransfer): Promise<void> {
        const {tx_hash, log_index} = transfer;

        await this.mongo.collection<TransferDoc>('transfers').updateOne(
            { tx_hash, log_index },
            { $setOnInsert: { ...transfer, created_at: new Date() } },
            { upsert: true },
        );
    }
}
