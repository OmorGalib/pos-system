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
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SalesService } from './sales.service';
import { CreateSaleDto } from './dto/create-sale.dto';

@Controller('sales')
@UseGuards(JwtAuthGuard)
export class SalesController {
  private readonly logger = new Logger(SalesController.name);
  
  constructor(private readonly salesService: SalesService) {}

  @Post()
  async create(@Body() createSaleDto: CreateSaleDto) {
    try {
      this.logger.log('Creating new sale');
      const result = await this.salesService.create(createSaleDto);
      return result;
    } catch (error) {
      this.logger.error('Error creating sale:', error);
      throw new HttpException(
        error.message || 'Failed to create sale',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      this.logger.log(`Fetching sales with page: ${page}, limit: ${limit}`);
      
      const result = await this.salesService.findAll({
        page,
        limit,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
      });
      
      this.logger.log(`Found ${result.data.length} sales`);
      return result;
    } catch (error) {
      this.logger.error('Error fetching sales:', error);
      this.logger.error('Error stack:', error.stack);
      throw new HttpException(
        error.message || 'Failed to fetch sales',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
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
      this.logger.error('Error stack:', error.stack);
      throw new HttpException(
        error.message || 'Failed to fetch dashboard stats',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    try {
      this.logger.log(`Fetching sale with id: ${id}`);
      const sale = await this.salesService.findOne(id);
      return sale;
    } catch (error) {
      this.logger.error(`Error fetching sale ${id}:`, error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch sale',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('today/revenue')
  async getTodayRevenue() {
    try {
      this.logger.log('Fetching today\'s revenue');
      const revenue = await this.salesService.getTodayRevenue();
      return revenue;
    } catch (error) {
      this.logger.error('Error fetching today\'s revenue:', error);
      throw new HttpException(
        error.message || 'Failed to fetch today\'s revenue',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}