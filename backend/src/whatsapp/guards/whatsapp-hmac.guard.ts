import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class WhatsappHmacGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const request = ctx.switchToHttp().getRequest<Request>();
    const signature = request.headers['x-hub-signature-256'] as string;

    if (!signature) {
      if (process.env.APP_ENV === 'development' || process.env.NODE_ENV === 'development') {
        return true;
      }
      throw new UnauthorizedException('Missing signature');
    }

    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
      throw new UnauthorizedException('App secret not configured');
    }

    // NestJS raw body — requires rawBody: true in NestFactory.create()
    const rawBody = (request as any).rawBody as Buffer;
    if (!rawBody) {
      throw new UnauthorizedException('Missing raw body');
    }

    const expected =
      'sha256=' + createHmac('sha256', appSecret).update(rawBody).digest('hex');

    const sigBuffer = Buffer.from(signature, 'utf8');
    const expBuffer = Buffer.from(expected, 'utf8');

    if (sigBuffer.length !== expBuffer.length) {
      throw new UnauthorizedException('Invalid signature length');
    }

    if (!timingSafeEqual(sigBuffer, expBuffer)) {
      throw new UnauthorizedException('Invalid signature');
    }

    return true;
  }
}
