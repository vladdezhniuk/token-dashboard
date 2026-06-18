import { Injectable, Logger } from "@nestjs/common"
import { DatabaseService } from "src/shared/db/database.service";
import { createPublicClient, erc20Abi, getContract, http } from "viem"
import { sepolia } from "viem/chains"


@Injectable()
export class NodeListener {
    private readonly logger = new Logger(NodeListener.name)
    constructor (private db: DatabaseService){}
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
                                this.db.query(
                                    `insert into transfers (address_from, address_to, amount, tx_hash, log_index)
                                        values ($1, $2, $3, $4, $5)
                                        on conflict (tx_hash, log_index) do nothing
                                        `,
                                    [
                                        l.args.from!.toLowerCase(),
                                        l.args.to!.toLowerCase(),
                                        l.args.value!.toString(),
                                        l.transactionHash,
                                        l.logIndex,
                                    ],
                                ),
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