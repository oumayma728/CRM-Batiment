import { Controller, Post, HttpCode } from '@nestjs/common';
import { SeedService } from './seed.service.js';

@Controller('seed')
export class SeedController {
  constructor(private seedService: SeedService) {}

  @Post('init')
  @HttpCode(200)
  async init() {
    return await this.seedService.seedDatabase();
  }
}
