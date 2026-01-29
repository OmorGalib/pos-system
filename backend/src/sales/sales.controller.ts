import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  ParseUUIDPipe,
  Param,
  Logger,
} from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, IsDateString } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

class GetSalesQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  private readonly logger = new Logger(SalesController.name);
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() createSaleDto: CreateSaleDto) {
    return this.salesService.create(createSaleDto);
  }

  @Get()
  async findAll(@Query() query: GetSalesQueryDto) {
    try {
      this.logger.log(`Fetching sales with query: ${JSON.stringify(query)}`);
      const result = await this.salesService.findAll({
        page: query.page || 1,
        limit: query.limit || 10,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
      });
      this.logger.log(`Found ${result.data.length} sales`);
      return result;
    } catch (error) {
      this.logger.error('Error fetching sales:', error);
      throw error;
    }
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    try {
      this.logger.log('Fetching dashboard stats');
      const stats = await this.salesService.getDashboardStats();
      return stats;
    } catch (error) {
      this.logger.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.salesService.findOne(id);
  }

  @Get('today/revenue')
  getTodayRevenue() {
    return this.salesService.getTodayRevenue();
  }
}