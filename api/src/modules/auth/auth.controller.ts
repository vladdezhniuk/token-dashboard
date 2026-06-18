import { Body, Controller, Get, Post, Req, Res } from "@nestjs/common";
import { AuthService } from "./auth.service";
import type { Request, Response } from 'express';
import { AuthDto } from "./dto/auth.dto";
import { Public } from "./auth.decorator";

const ACCESS_COOKIE = 'access_token';
const nonce = process.env.WALLET_SIGN_NONCE;

const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 1000 * 60 * 60 * 24,
  path: '/',
};

@Controller('auth')
export class AuthController {
    constructor(private readonly service: AuthService) {}

    @Public()
    @Get('nonce')
    public async nonce () {
        return nonce;
    }

    @Public()
    @Post('sign-in')
    public async singIn(
        @Body() body: AuthDto,
        @Res({ passthrough: true }) res: Response
    ) {
        const jwtToken = await this.service.signIn(body.address, body.signature);

        res.cookie(ACCESS_COOKIE, jwtToken, accessCookieOptions);
    }

    @Get('me')
    public me(@Req() req: Request) {
        const user = req['user'] as { userId: string; address: string };
        return { address: user.address };
    }
}
