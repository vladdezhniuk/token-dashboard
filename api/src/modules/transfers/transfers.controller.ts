import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { Transfer, TransfersService } from "./transfers.service";
import { GetTransfersDto } from "./dto/getTransfers.dto";
import { AuthGuard } from "../auth/auth.guard";


@Controller('transfers')
export class TransfersController {
    constructor(private readonly service: TransfersService){}
    @Get('/')
    public async getTransfers (
        @Query() query: GetTransfersDto
    ):Promise<Transfer[]> {
        return await this.service.getTransfers(query.address, query.type);
    }
}