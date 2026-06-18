import { Injectable } from "@nestjs/common"
import { DatabaseService } from "src/shared/db/database.service";
import { createPublicClient, erc20Abi, getContract, http } from "viem"
import { sepolia } from "viem/chains"


@Injectable()
export class NodeListener {
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
                onLogs: async (logs) => {
                    await Promise.all(
                        logs.map((l) =>
                            this.db.query(
                                `insert into transfers (address_from, address_to, amount, tx_hash)
                                    values ($1, $2, $3, $4)
                                    on conflict (tx_hash) do nothing
                                    `,
                                [
                                    l.args.from!.toLowerCase(),
                                    l.args.to!.toLowerCase(),
                                    l.args.value!.toString(),
                                    l.transactionHash,
                                ],
                            ),
                        ),
                    );
                }
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