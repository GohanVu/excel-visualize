import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';

interface GoogleProfile {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  googleRefreshToken?: string;
}

@Injectable()
export class AuthService {
  private readonly encryptionKey: Buffer;

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {
    // Derive 32-byte key from JWT_SECRET — stable across restarts
    this.encryptionKey = scryptSync(
      config.getOrThrow('JWT_SECRET'),
      'chartly-salt',
      32,
    );
  }

  async findOrCreateGoogleUser(profile: GoogleProfile): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { googleId: profile.googleId },
    });

    const encryptedToken = profile.googleRefreshToken
      ? this.encryptToken(profile.googleRefreshToken)
      : undefined;

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          googleId: profile.googleId,
          email: profile.email,
          name: profile.name,
          avatarUrl: profile.avatarUrl,
          encryptedRefreshToken: encryptedToken,
          subscription: { create: { plan: 'free', status: 'active' } },
        },
      });
    } else if (encryptedToken) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { encryptedRefreshToken: encryptedToken },
      });
    }

    return user;
  }

  generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: '15m',
    });

    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
      expiresIn: '7d',
    });

    return { accessToken, refreshToken };
  }

  verifyRefreshToken(token: string) {
    return this.jwt.verify(token, {
      secret: this.config.getOrThrow('JWT_REFRESH_SECRET'),
    });
  }

  private encryptToken(token: string): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
  }

  decryptToken(encrypted: string): string {
    const [ivHex, dataHex] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(dataHex, 'hex')),
      decipher.final(),
    ]);
    return decrypted.toString('utf8');
  }
}
