import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ParserService } from '../parser/parser.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';

const FREE_LIMIT_BYTES = 10 * 1024 * 1024;
const PRO_LIMIT_BYTES = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

@Injectable()
export class DatasetsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private parser: ParserService,
  ) {}

  async presignUpload(user: User, dto: PresignUploadDto) {
    const isPro = await this.isProUser(user.id);
    const maxBytes = isPro ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;
    const maxMb = maxBytes / 1024 / 1024;

    if (dto.fileSize > maxBytes) {
      throw new BadRequestException(
        `File quá lớn. Giới hạn ${maxMb}MB cho plan ${isPro ? 'Pro' : 'Free'}.`,
      );
    }

    const ext = this.getExtension(dto.filename);
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestException('Chỉ chấp nhận file .xlsx, .xls, .csv');
    }

    const rand = Math.random().toString(36).slice(2, 8);
    const objectKey = `${user.id}/${Date.now()}-${rand}${ext}`;
    const presignedUrl = await this.storage.presignedPutUrl(objectKey);

    return { presignedUrl, objectKey };
  }

  async confirmUpload(user: User, dto: ConfirmUploadDto) {
    return this.prisma.dataset.create({
      data: {
        userId: user.id,
        name: this.baseName(dto.originalFilename),
        originalName: dto.originalFilename,
        mimeType: dto.mimeType,
        sizeBytes: dto.fileSize,
        minioKey: dto.objectKey,
      },
    });
  }

  async parseDataset(userId: string, datasetId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, userId },
    });
    if (!dataset) throw new NotFoundException('Dataset không tồn tại.');

    const buffer = await this.storage.getObject(dataset.minioKey);
    const { headers, rows } = this.parser.parse(buffer, dataset.mimeType);

    const columns = headers.map((name, index) => ({
      name,
      index,
      sampleValues: rows.slice(0, 3).map((row) => row[index] ?? ''),
    }));

    const previewRows = rows.slice(0, 10).map((row) =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? ''])),
    );

    return {
      datasetId: dataset.id,
      name: dataset.name,
      totalRows: rows.length,
      columns,
      previewRows,
    };
  }

  async findAllByUser(userId: string) {
    return this.prisma.dataset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async isProUser(userId: string): Promise<boolean> {
    const sub = await this.prisma.subscription.findUnique({
      where: { userId },
    });
    return sub?.plan === 'pro' && sub?.status === 'active';
  }

  private getExtension(filename: string): string {
    const dot = filename.lastIndexOf('.');
    return dot === -1 ? '' : filename.slice(dot).toLowerCase();
  }

  private baseName(filename: string): string {
    return filename.replace(/\.[^/.]+$/, '');
  }
}
