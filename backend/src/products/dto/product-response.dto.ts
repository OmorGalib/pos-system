import { Expose, Transform } from 'class-transformer';

export class ProductResponseDto {
  @Expose()
  id: string;

  @Expose()
  name: string;

  @Expose()
  sku: string;

  @Expose()
  @Transform(({ value }) => value ? Number(value) : 0)
  price: number;

  @Expose()
  stockQuantity: number;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Expose()
  _count?: {
    saleItems: number;
  };
}