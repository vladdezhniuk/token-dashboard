import { Injectable } from "@nestjs/common"
import { log } from "node:console"
import { createPublicClient, erc20Abi, getContract, http } from "viem"
import { sepolia } from "viem/chains"


@Injectable()
export class NodeListener {
    public node = createPublicClient({
        chain: sepolia,
        transport: http(),
    })

    public contract = getContract({
        address: process.env.TOKEN_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        client: this.node,
    })

    public watch() {
        log('transfer event watching started')
        return this.contract.watchEvent.Transfer(
            {},
            {
                onLogs : logs => log(`${logs}`)
            }
        )
    }

    onModuleInit() {
        this.watch()
    }

    onModuleDestroy() {
        const unwatch = this.watch();
        unwatch();
    }
}