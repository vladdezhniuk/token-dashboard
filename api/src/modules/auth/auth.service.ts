import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verifyMessage } from 'viem'
import { USER_REPOSITORY, type UserRepository } from "src/shared/db/repositories/user.repository";


@Injectable()
export class AuthService {
    constructor(
        @Inject(USER_REPOSITORY) private readonly users: UserRepository,
        private jwt: JwtService,
    ) {}
    public async signIn (address: string, signature: string): Promise<string> {
        const verified  = await verifyMessage({address: address as `0x${string}`, message: process.env.WALLET_SIGN_NONCE!, signature: signature as `0x${string}`});

        if(!verified) {
            throw new UnauthorizedException();
        }

        const user = await this.users.upsertByWallet(address.toLowerCase());

        const payload = { sub: user.id, address: address.toLowerCase() };

        return await this.jwt.signAsync(payload);
    }
}
