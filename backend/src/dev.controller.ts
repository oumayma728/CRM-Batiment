import { Controller, Post, HttpCode } from '@nestjs/common';
import { AppService } from './app.service.js';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('Development')
@Controller('api/dev')
export class DevController {
  constructor(private appService: AppService) {}

  @Post('seed')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Initialize database with test data (Dev only)',
    description:
      'Creates test users, companies, and sample data. NEVER use in production!',
  })
  async seed() {
    return this.appService.seedDatabase();
  }
}
