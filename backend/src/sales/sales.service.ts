import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import dayjs from 'dayjs';
import { CreateSaleDto } from './dto/create-sale.dto';

// Helper function to safely convert any value to number
function toNumber(value: any): number {
  if (value === null || value === undefined) {
    return 0;
  }
  
  // If it's already a number
  if (typeof value === 'number') {
    return value;
  }
  
  // If it's a Prisma Decimal
  if (value && typeof value === 'object' && 'toNumber' in value) {
    return value.toNumber();
  }
  
  // If it's a string
  if (typeof value === 'string') {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  
  return 0;
}

@Injectable()
export class SalesService {
  constructor(
    private prisma: PrismaService,
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
            itemPrice: toNumber(product.price),
          };
        }),
      );

      // Calculate total amount
      const totalAmount = productValidations.reduce(
        (sum, validation) =>
          sum + validation.itemPrice * validation.requestedQuantity,
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

      // Convert all Decimal values to numbers
      const transformedSales = sales.map(sale => ({
        ...sale,
        id: sale.id,
        totalAmount: toNumber(sale.totalAmount),
        createdAt: sale.createdAt,
        updatedAt: sale.updatedAt,
        items: sale.items.map(item => ({
          ...item,
          id: item.id,
          saleId: item.saleId,
          productId: item.productId,
          quantity: item.quantity,
          price: toNumber(item.price),
          product: item.product ? {
            ...item.product,
            price: toNumber(item.product.price),
          } : null,
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
      throw new Error(`Failed to fetch sales: ${error.message}`);
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
      totalAmount: toNumber(sale.totalAmount),
      items: sale.items.map(item => ({
        ...item,
        price: toNumber(item.price),
        product: item.product ? {
          ...item.product,
          price: toNumber(item.product.price),
        } : null,
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
      throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
    }
  }
  
  async getTodayRevenue() {
    const today = dayjs().startOf('day').toDate();
    const tomorrow = dayjs().add(1, 'day').startOf('day').toDate();

    try {
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
        revenue: toNumber(result._sum.totalAmount),
      };
    } catch (error) {
      console.error('Error in getTodayRevenue:', error);
      throw new Error(`Failed to fetch today's revenue: ${error.message}`);
    }
  }
}