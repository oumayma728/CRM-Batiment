import { Module } from '@nestjs/common';
import { RagController } from './rag.controller.js';
import { RagService } from './rag.service.js';
import { AssistantModule } from '../assistant/assistant.module.js';

@Module({
  imports: [AssistantModule],
  controllers: [RagController],
  providers: [RagService],
  exports: [RagService],
})
export class RagModule {}
