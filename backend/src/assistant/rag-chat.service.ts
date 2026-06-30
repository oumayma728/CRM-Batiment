import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export type RagSnippetPayload = {
  sourceType: string;
  title: string;
  excerpt: string;
  score: number;
};

@Injectable()
export class RagChatService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Sessions ───────────────────────────────────────────────────────────────

  async createSession(userId: number, companyId: number, titre?: string) {
    return this.prisma.ragChatSession.create({
      data: {
        userId,
        companyId,
        titre: titre?.trim() || 'Nouvelle conversation',
      },
    });
  }

  async getSessions(companyId: number, userId: number) {
    return this.prisma.ragChatSession.findMany({
      where: { companyId, userId },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        titre: true,
        createdAt: true,
        updatedAt: true,
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' },
          select: { contenu: true, role: true },
        },
      },
    });
  }

  async getSession(sessionId: number, companyId: number) {
    const session = await this.prisma.ragChatSession.findFirst({
      where: { id: sessionId, companyId },
    });
    if (!session) throw new NotFoundException('Session introuvable');
    return session;
  }

  async renameSession(sessionId: number, companyId: number, titre: string) {
    await this.getSession(sessionId, companyId);
    return this.prisma.ragChatSession.update({
      where: { id: sessionId },
      data: { titre: titre.trim().slice(0, 120) },
    });
  }

  async deleteSession(sessionId: number, companyId: number) {
    await this.getSession(sessionId, companyId);
    await this.prisma.ragChatSession.delete({ where: { id: sessionId } });
    return { deleted: true, sessionId };
  }

  async deleteAllSessions(companyId: number, userId: number) {
    const result = await this.prisma.ragChatSession.deleteMany({
      where: { companyId, userId },
    });
    return { deleted: result.count };
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  async getMessages(sessionId: number, companyId: number) {
    await this.getSession(sessionId, companyId);
    return this.prisma.ragChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMessage(
    sessionId: number,
    role: 'user' | 'assistant',
    contenu: string,
    snippets?: RagSnippetPayload[],
  ) {
    const msg = await this.prisma.ragChatMessage.create({
      data: {
        sessionId,
        role,
        contenu,
        snippets: snippets ? (snippets as any) : undefined,
      },
    });

    // Touch updatedAt on the session so it bubbles up in sort order
    await this.prisma.ragChatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return msg;
  }

  /** Auto-generate a session title from the first user message */
  autoTitle(firstUserMessage: string): string {
    const cleaned = firstUserMessage.trim().replace(/\s+/g, ' ');
    return cleaned.length > 60 ? `${cleaned.slice(0, 57)}…` : cleaned;
  }
}
