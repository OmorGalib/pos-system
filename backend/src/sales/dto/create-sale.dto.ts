import { Type } from 'class-transformer';
import {
  IsArray,
  ValidateNested,
  IsUUID,
  IsNumber,
  IsPositive,
  Min,
  ArrayMinSize,
} from 'class-validator';

export class SaleItemDto {
  @IsUUID()
  productId: string;

  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
}

export class CreateSaleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}