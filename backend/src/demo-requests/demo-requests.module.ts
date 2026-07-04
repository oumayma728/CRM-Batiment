import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module.js';
import { DemoRequestsController } from './demo-requests.controller.js';
import { DemoRequestsService } from './demo-requests.service.js';

@Module({
  imports: [AuditModule],
  controllers: [DemoRequestsController],
  providers: [DemoRequestsService],
})
export class DemoRequestsModule {}
