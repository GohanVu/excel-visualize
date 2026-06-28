import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SaveProgressDto } from './dto/save-progress.dto';

@Injectable()
export class StudyProgressService {
  constructor(private prisma: PrismaService) {}

  // Upsert tiến độ 1 thẻ. seenCount tăng mỗi lần ôn; lastReviewedAt = giờ hiện tại.
  // Unique theo (userId, datasetId, sheet, cardKey) → mỗi thẻ chỉ 1 record.
  async saveProgress(userId: string, dto: SaveProgressDto) {
    await this.assertDatasetOwner(userId, dto.datasetId);
    const sheet = dto.sheet ?? '';
    const now = new Date();

    return this.prisma.studyProgress.upsert({
      where: {
        userId_datasetId_sheet_cardKey: {
          userId,
          datasetId: dto.datasetId,
          sheet,
          cardKey: dto.cardKey,
        },
      },
      create: {
        userId,
        datasetId: dto.datasetId,
        sheet,
        cardKey: dto.cardKey,
        status: dto.status,
        seenCount: 1,
        lastReviewedAt: now,
      },
      update: {
        status: dto.status,
        seenCount: { increment: 1 },
        lastReviewedAt: now,
      },
    });
  }

  // Đọc tiến độ của 1 dataset (theo tab) — FE map theo cardKey để hiện "đã thuộc X/Y".
  async getProgress(userId: string, datasetId: string, sheet = '') {
    await this.assertDatasetOwner(userId, datasetId);

    const items = await this.prisma.studyProgress.findMany({
      where: { userId, datasetId, sheet },
      select: {
        cardKey: true,
        status: true,
        seenCount: true,
        lastReviewedAt: true,
      },
    });

    return { items };
  }

  // Chặn user đọc/ghi tiến độ của dataset không phải của mình
  private async assertDatasetOwner(userId: string, datasetId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, userId },
      select: { id: true },
    });
    if (!dataset) throw new NotFoundException('Dataset không tồn tại.');
  }
}
