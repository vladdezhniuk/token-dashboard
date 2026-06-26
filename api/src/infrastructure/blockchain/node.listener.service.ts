import { Inject, Injectable, Logger } from "@nestjs/common"
import { TRANSFER_REPOSITORY, type TransferRepository } from "src/shared/db/repositories/transfer.repository";
import { createPublicClient, erc20Abi, getContract, http } from "viem"
import { sepolia } from "viem/chains"


@Injectable()
export class NodeListener {
    private readonly logger = new Logger(NodeListener.name)
    constructor (@Inject(TRANSFER_REPOSITORY) private readonly transfers: TransferRepository){}
    public unwatch: null | (() => void) = null;
    public node = createPublicClient({
        chain: sepolia,
        transport: http(process.env.RPC_URL),
    })

    public contract = getContract({
        address: process.env.TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        client: this.node,
    })

    public watch() {
        const unwatch = this.contract.watchEvent.Transfer(
            {},
            {
                // Errors here must never escape: an unhandled rejection in this async
                // callback would crash the whole API process (Node v15+).
                onLogs: async (logs) => {
                    try {
                        await Promise.all(
                            logs.map((l) =>
                                this.transfers.insert({
                                    address_from: l.args.from!.toLowerCase(),
                                    address_to: l.args.to!.toLowerCase(),
                                    amount: l.args.value!.toString(),
                                    tx_hash: l.transactionHash!,
                                    log_index: l.logIndex!,
                                }),
                            ),
                        );
                    } catch (e) {
                        this.logger.error(`failed to persist transfers: ${e instanceof Error ? e.message : e}`)
                    }
                },
                onError: (error) => this.logger.error(`Transfer watch error: ${error.message}`),
            }
        )

        this.unwatch = unwatch;
    }

    onModuleInit() {
        this.watch()
    }

    onModuleDestroy() {
        this.unwatch?.()
    }
}