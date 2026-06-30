import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { User, ColumnType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { ParserService } from '../parser/parser.service';
import { ColumnTypeService } from '../parser/column-type.service';
import { ChartSuggesterService } from '../suggester/chart-suggester.service';
import { PresignUploadDto } from './dto/presign-upload.dto';
import { ConfirmUploadDto } from './dto/confirm-upload.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

const FREE_LIMIT_BYTES = 10 * 1024 * 1024;
const PRO_LIMIT_BYTES = 50 * 1024 * 1024;
// Số sheet (file) tối đa cùng lúc theo gói
const FREE_DATASET_LIMIT = 2;
const PRO_DATASET_LIMIT = 20;
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

@Injectable()
export class DatasetsService {
  constructor(
    private prisma: PrismaService,
    private storage: StorageService,
    private parser: ParserService,
    private columnType: ColumnTypeService,
    private suggester: ChartSuggesterService,
    private auditLogs: AuditLogsService,
  ) {}

  async presignUpload(user: User, dto: PresignUploadDto) {
    const isPro = await this.isProUser(user.id);
    const maxBytes = isPro ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;
    const maxMb = maxBytes / 1024 / 1024;

    // Quota số sheet — chặn khi đầy, user tự xoá bớt (Session 19)
    const maxDatasets = isPro ? PRO_DATASET_LIMIT : FREE_DATASET_LIMIT;
    const datasetCount = await this.prisma.dataset.count({
      where: { userId: user.id },
    });
    if (datasetCount >= maxDatasets) {
      throw new BadRequestException(
        `Đã đạt giới hạn ${maxDatasets} sheet (gói ${isPro ? 'Pro' : 'Free'}). Xoá bớt sheet để thêm mới.`,
      );
    }

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
    const dataset = await this.prisma.dataset.create({
      data: {
        userId: user.id,
        name: this.baseName(dto.originalFilename),
        originalName: dto.originalFilename,
        mimeType: dto.mimeType,
        sizeBytes: dto.fileSize,
        minioKey: dto.objectKey,
      },
    });

    await this.auditLogs.log({
      userId: user.id,
      action: 'dataset.upload',
      entity: 'Dataset',
      entityId: dataset.id,
      metadata: { name: dataset.name, originalName: dataset.originalName },
    });

    return dataset;
  }

  async parseDataset(
    userId: string,
    datasetId: string,
    sheetName?: string,
    headerRow?: number,
  ) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, userId },
    });
    if (!dataset) throw new NotFoundException('Dataset không tồn tại.');

    const buffer = await this.storage.getObject(dataset.minioKey);
    const {
      headers,
      rows,
      headerRowIndex,
      headerConfident,
      sheets,
      sheetName: activeSheet,
    } = this.parser.parse(buffer, dataset.mimeType, { sheetName, headerRow });

    // Tên hiển thị: header trống → "Cột N" (tránh chip rỗng + key trùng ở preview)
    const displayNames = headers.map((h, i) => h.trim() || `Cột ${i + 1}`);

    const columns = headers
      .map((_, index) => ({
        index,
        allValues: rows.map((row) => row[index] ?? ''),
      }))
      // Bỏ cột rỗng hoàn toàn (cột ảnh, cột tách trống) — không đưa lên UI.
      // Giữ nguyên `index` gốc để /suggest map cột đúng.
      .filter((c) => c.allValues.some((v) => v.toString().trim().length > 0))
      .map(({ index, allValues }) => {
        const { type, confidence } = this.columnType.detect(allValues);
        return {
          name: displayNames[index],
          index,
          type,
          confidence,
          sampleValues: allValues.slice(0, 3),
        };
      });

    // Preview chỉ gồm các cột được giữ, key theo tên hiển thị
    const previewRows = rows.slice(0, 10).map((row) =>
      Object.fromEntries(columns.map((c) => [c.name, row[c.index] ?? ''])),
    );

    // Data "hợp để học" (flashcard/quiz): ≥2 cột chữ (string/category) để ghép
    // mặt trước/sau. VD bảng từ vựng. Số ít/không có → thiên về học hơn là chart.
    const textColumns = columns.filter(
      (c) => c.type === ColumnType.string || c.type === ColumnType.category,
    ).length;
    const learnable = textColumns >= 2;

    return {
      datasetId: dataset.id,
      name: dataset.name,
      totalRows: rows.length,
      sheets,
      activeSheet,
      headerRowIndex,
      headerConfident,
      learnable,
      columns,
      previewRows,
    };
  }

  async suggestCharts(
    userId: string,
    datasetId: string,
    columnIndexes: number[],
    opts: {
      sheetName?: string;
      headerRow?: number;
      typeOverrides?: { index: number; type: ColumnType }[];
    } = {},
  ) {
    const { columns } = await this.parseDataset(
      userId,
      datasetId,
      opts.sheetName,
      opts.headerRow,
    );

    // Áp kiểu cột user đã sửa tay (override) trước khi gợi ý
    const overrides = new Map(
      (opts.typeOverrides ?? []).map((o) => [o.index, o.type]),
    );

    const selected = columnIndexes
      .map((i) => columns.find((c) => c.index === i))
      .filter((c): c is (typeof columns)[number] => c != null)
      .map((c) => ({ name: c.name, type: overrides.get(c.index) ?? c.type }));

    if (selected.length === 0) {
      throw new BadRequestException('Cột đã chọn không hợp lệ.');
    }

    return { datasetId, suggestions: this.suggester.suggest(selected) };
  }

  async getRows(
    userId: string,
    datasetId: string,
    sheetName?: string,
    headerRow?: number,
  ) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, userId },
    });
    if (!dataset) throw new NotFoundException('Dataset không tồn tại.');

    const buffer = await this.storage.getObject(dataset.minioKey);
    const { headers, rows } = this.parser.parse(buffer, dataset.mimeType, {
      sheetName,
      headerRow,
    });

    // Key theo tên hiển thị (header trống → "Cột N") để khớp encoding của chart
    const displayNames = headers.map((h, i) => h.trim() || `Cột ${i + 1}`);
    const allRows = rows.map((row) =>
      Object.fromEntries(displayNames.map((name, i) => [name, row[i] ?? ''])),
    );

    return { datasetId, rows: allRows };
  }

  async findAllByUser(userId: string) {
    return this.prisma.dataset.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async deleteDataset(userId: string, datasetId: string) {
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, userId },
    });
    if (!dataset) throw new NotFoundException('Dataset không tồn tại.');

    // Chart.datasetId là onDelete:Restrict → xoá chart của dataset này trước.
    // columns + studyProgress tự cascade khi xoá dataset.
    await this.prisma.$transaction([
      this.prisma.chart.deleteMany({ where: { datasetId } }),
      this.prisma.dataset.delete({ where: { id: datasetId } }),
    ]);

    await this.auditLogs.log({
      userId,
      action: 'dataset.delete',
      entity: 'Dataset',
      entityId: datasetId,
      metadata: { name: dataset.name },
    });

    // Dọn file trên MinIO (best-effort — record đã xoá, không chặn nếu lỗi)
    await this.storage.removeObject(dataset.minioKey).catch(() => undefined);

    return { id: datasetId, deleted: true };
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
