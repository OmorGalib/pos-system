import { IsString, IsNumber, IsPositive, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateProductDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @MinLength(3)
  @MaxLength(50)
  sku: string;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseFloat(value))
  price: number;

  @IsNumber()
  @IsPositive()
  @Transform(({ value }) => parseInt(value, 10))
  stockQuantity: number;
}