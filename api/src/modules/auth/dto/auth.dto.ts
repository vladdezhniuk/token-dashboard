import { IsEthereumAddress, IsString } from "class-validator";

export class AuthDto {
    @IsString()
    signature: string;

    @IsEthereumAddress()
    address: string;
}