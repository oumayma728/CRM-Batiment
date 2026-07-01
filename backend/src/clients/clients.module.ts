import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service.js';
import {
  ClientsController,
  ClientsPublicController,
} from './clients.controller.js';

@Module({
  controllers: [ClientsController, ClientsPublicController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
