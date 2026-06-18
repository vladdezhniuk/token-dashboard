import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DatabaseService } from "src/shared/db/database.service";
import {verifyMessage} from 'viem'


@Injectable()
export class AuthService {
    constructor(private db: DatabaseService, private jwt: JwtService) {}
    public async signIn (address: string, signature: string): Promise<string> {
        const verified  = await verifyMessage({address: address as `0x${string}`, message: process.env.WALLET_SIGN_NONCE!, signature: signature as `0x${string}`});

        if(!verified) {
            throw new UnauthorizedException();
        }

        try{
            await this.db.query('insert into users (wallet_address) values ($1)', [address.toLowerCase()]);
        } catch(error) {
            if (error.code !== '23505') throw error;
        }

        const {rows} = await this.db.query(`select * from users where wallet_address = $1`, [address]);
        const userId = rows[0].id;

        const payload = {sub: userId};

        return await this.jwt.signAsync(payload);
    }
}