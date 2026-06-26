export interface Transfer {
    id: string;
    address_from: string;
    address_to: string;
    amount: string;
    tx_hash: string;
    created_at: Date;
}

export type TransferDirection = 'sent' | 'received';

export interface NewTransfer {
    address_from: string;
    address_to: string;
    amount: string;
    tx_hash: string;
    log_index: number;
}

export interface TransferRepository {
    findByAddress(address: string, direction?: TransferDirection): Promise<Transfer[]>;
    insert(transfer: NewTransfer): Promise<void>;
}

export const TRANSFER_REPOSITORY = Symbol('TRANSFER_REPOSITORY');
