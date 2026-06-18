import { IsEthereumAddress, IsIn, IsOptional, } from "class-validator";

export class GetTransfersDto {
    @IsEthereumAddress()
    address: string;

    @IsOptional()
    @IsIn(['sent', 'received'])
    type?: string;
}