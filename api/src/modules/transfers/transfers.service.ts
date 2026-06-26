import { Inject, Injectable } from "@nestjs/common";
import {
    TRANSFER_REPOSITORY,
    type TransferDirection,
    type TransferRepository,
} from "src/shared/db/repositories/transfer.repository";

export type { Transfer, TransferDirection } from "src/shared/db/repositories/transfer.repository";

@Injectable()
export class TransfersService {
    constructor(@Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository) {}

    public async getTransfers(address: string, direction?: string) {
        return this.transfers.findByAddress(
            address.toLowerCase(),
            direction as TransferDirection | undefined,
        );
    }
}
