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

      // Calculate total amount
      const totalAmount = productValidations.reduce(
        (sum, validation) =>
          sum + validation.itemPrice.toNumber() * validation.requestedQuantity,
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
    const where: Record<string, any> = {};

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = startDate;
      }
      if (endDate) {
        where.createdAt.lte = endDate;
      }
    }

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

    return {
      data: sales.map(sale => ({
        ...sale,
        totalAmount: sale.totalAmount.toNumber(),
        items: sale.items.map(item => ({
          ...item,
          price: item.price.toNumber(),
        })),
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
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
      totalAmount: sale.totalAmount.toNumber(),
      items: sale.items.map(item => ({
        ...item,
        price: item.price.toNumber(),
      })),
    };
  }

  async getDashboardStats() {
    const today = dayjs().startOf('day').toDate();
    const yesterday = dayjs().subtract(1, 'day').startOf('day').toDate();

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
          product,
        };
      }),
    );

    return {
      summary: {
        totalSales,
        totalRevenue: totalRevenue._sum.totalAmount?.toNumber() || 0,
        todaySales,
        todayRevenue: todayRevenue._sum.totalAmount?.toNumber() || 0,
      },
      lowStockProducts: lowStockProducts.map(product => ({
        ...product,
        price: product.price.toNumber(),
      })),
      topProducts: topProductsWithDetails,
    };
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
      revenue: result._sum.totalAmount?.toNumber() || 0,
    };
  }
}