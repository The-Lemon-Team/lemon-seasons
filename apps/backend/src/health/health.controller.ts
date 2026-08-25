import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('api/health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check health and database connectivity probe' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service or database is unhealthy' })
  async check(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'connected',
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        database: 'disconnected',
        message: error instanceof Error ? error.message : 'Unknown database error',
      });
    }
  }
}
