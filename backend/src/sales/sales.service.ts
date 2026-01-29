import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { CreateSaleDto } from './dto/create-sale.dto';

function toNumber(value: any): number {
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    return parseFloat(value);
  }
  return 0;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  async create(createSaleDto: CreateSaleDto) {
    if (!createSaleDto.items || createSaleDto.items.length === 0) {
      throw new BadRequestException('Sale must contain at least one item');
    }

    return await this.prisma.$transaction(async (tx) => {
      // Validate all products and check stock
      const productValidations = await Promise.all(
        createSaleDto.items.map(async (item) => {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
          });

          if (!product) {
            throw new NotFoundException(
              `Product not found: ${item.productId}`,
            );
          }

          if (product.stockQuantity < item.quantity) {
            throw new BadRequestException(
              `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
            );
          }

          if (item.quantity <= 0) {
            throw new BadRequestException(
              `Invalid quantity for ${product.name}. Quantity must be positive`,
            );
          }

          return {
            product,
            requestedQuantity: item.quantity,
            itemPrice: product.price,
          };
        }),
      );

      // Calculate total amount - convert itemPrice to number (handles Decimal)
      const totalAmount = productValidations.reduce<number>(
        (sum, validation) =>
          sum +
          (typeof validation.itemPrice === 'number'
            ? validation.itemPrice
            : parseFloat(validation.itemPrice?.toString() || '0')) *
            validation.requestedQuantity,
        0,
      );

      // Create sale with items
      const sale = await tx.sale.create({
        data: {
          totalAmount,
          items: {
            create: createSaleDto.items.map((item, index) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: productValidations[index].itemPrice,
            })),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
      });

      // Update product stock quantities
      await Promise.all(
        createSaleDto.items.map((item) =>
          tx.product.update({
            where: { id: item.productId },
            data: {
              stockQuantity: {
                decrement: item.quantity,
              },
            },
          }),
        ),
      );

      return sale;
    });
  }

  async findAll(params: {
    page: number;
    limit: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page, limit, startDate, endDate } = params;
    const skip = (page - 1) * limit;

    const where: Prisma.SaleWhereInput = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

    try {
      const [sales, total] = await Promise.all([
        this.prisma.sale.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                    price: true,
                  },
                },
              },
            },
          },
        }),
        this.prisma.sale.count({ where }),
      ]);

      // Simplified conversion
      const transformedSales = sales.map(sale => ({
        ...sale,
        totalAmount: toNumber(sale.totalAmount),
        items: sale.items.map(item => ({
          ...item,
          price: toNumber(item.price),
        })),
      }));

      return {
        data: transformedSales,
        meta: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      console.error('Error in findAll:', error);
      throw error;
    }
  }

  async findOne(id: string) {
    const sale = await this.prisma.sale.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                price: true,
              },
            },
          },
        },
      },
    });

    if (!sale) {
      throw new NotFoundException('Sale not found');
    }

    return {
      ...sale,
      totalAmount: typeof sale.totalAmount === 'number'
        ? sale.totalAmount
        : parseFloat(sale.totalAmount?.toString() || '0'),
      items: sale.items.map(item => ({
        ...item,
        price: typeof item.price === 'number'
          ? item.price
          : parseFloat(item.price?.toString() || '0'),
      })),
    };
  }

  async getDashboardStats() {
    const today = dayjs().startOf('day').toDate();
    
    try {
      const [
        totalSales,
        totalRevenue,
        todaySales,
        todayRevenue,
        lowStockProducts,
        topProducts,
      ] = await Promise.all([
        this.prisma.sale.count(),
        this.prisma.sale.aggregate({
          _sum: { totalAmount: true },
        }),
        this.prisma.sale.count({
          where: { createdAt: { gte: today } },
        }),
        this.prisma.sale.aggregate({
          where: { createdAt: { gte: today } },
          _sum: { totalAmount: true },
        }),
        this.prisma.product.findMany({
          where: { stockQuantity: { lt: 10 } },
          take: 5,
          orderBy: { stockQuantity: 'asc' },
          select: {
            id: true,
            name: true,
            sku: true,
            stockQuantity: true,
            price: true,
          },
        }),
        this.prisma.saleItem.groupBy({
          by: ['productId'],
          _sum: { quantity: true },
          _count: true,
          take: 5,
          orderBy: { _sum: { quantity: 'desc' } },
        }),
      ]);

      // Get product details for top products
      const topProductsWithDetails = await Promise.all(
        topProducts.map(async (item) => {
          const product = await this.prisma.product.findUnique({
            where: { id: item.productId },
            select: {
              name: true,
              sku: true,
              price: true,
            },
          });
          return {
            ...item,
            product: product ? {
              ...product,
              price: toNumber(product.price),
            } : null,
          };
        }),
      );

      return {
        summary: {
          totalSales,
          totalRevenue: toNumber(totalRevenue._sum.totalAmount),
          todaySales,
          todayRevenue: toNumber(todayRevenue._sum.totalAmount),
        },
        lowStockProducts: lowStockProducts.map(product => ({
          ...product,
          price: toNumber(product.price),
        })),
        topProducts: topProductsWithDetails,
      };
    } catch (error) {
      console.error('Error in getDashboardStats:', error);
      throw error;
    }
  }
  
  async getTodayRevenue() {
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();

    const result = await this.prisma.sale.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        totalAmount: true,
      },
      _count: true,
    });

    return {
      count: result._count,
      revenue: typeof result._sum.totalAmount === 'number'
        ? result._sum.totalAmount
        : parseFloat(result._sum.totalAmount?.toString() || '0'),
    };
  }
}