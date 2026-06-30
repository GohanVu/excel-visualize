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
import { AuthService } from '../auth/auth.service';

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
    private authService: AuthService,
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

  async importGoogleSheet(user: User, url: string) {
    const isPro = await this.isProUser(user.id);

    // 1. Kiểm tra quota số lượng sheet
    const maxDatasets = isPro ? PRO_DATASET_LIMIT : FREE_DATASET_LIMIT;
    const datasetCount = await this.prisma.dataset.count({
      where: { userId: user.id },
    });
    if (datasetCount >= maxDatasets) {
      throw new BadRequestException(
        `Đã đạt giới hạn ${maxDatasets} sheet (gói ${isPro ? 'Pro' : 'Free'}). Xoá bớt sheet để thêm mới.`,
      );
    }

    // 2. Trích xuất spreadsheetId từ URL
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      throw new BadRequestException('Đường dẫn Google Sheet không hợp lệ.');
    }
    const spreadsheetId = match[1];

    // 3. Tải file
    const { buffer, filename } = await this.downloadGoogleSheet(user.id, spreadsheetId);

    // Kiểm tra kích thước file
    const maxBytes = isPro ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;
    const maxMb = maxBytes / 1024 / 1024;
    if (buffer.length > maxBytes) {
      throw new BadRequestException(
        `Dữ liệu Google Sheet quá lớn. Giới hạn ${maxMb}MB cho plan ${isPro ? 'Pro' : 'Free'}.`,
      );
    }

    // 4. Upload XLSX lên MinIO
    const ext = '.xlsx';
    const rand = Math.random().toString(36).slice(2, 8);
    const objectKey = `google-sheets/${user.id}/${Date.now()}-${rand}${ext}`;

    await this.storage.putObject(
      objectKey,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // 5. Lưu vào Database
    const dataset = await this.prisma.dataset.create({
      data: {
        userId: user.id,
        name: this.baseName(filename),
        originalName: filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        sizeBytes: buffer.length,
        minioKey: objectKey,
        googleSpreadsheetId: spreadsheetId,
        lastSyncedAt: new Date(),
      },
    });

    // 6. Ghi Audit Log
    await this.auditLogs.log({
      userId: user.id,
      action: 'dataset.import_google_sheet',
      entity: 'Dataset',
      entityId: dataset.id,
      metadata: { name: dataset.name, spreadsheetId },
    });

    return dataset;
  }

  async syncGoogleSheet(userId: string, datasetId: string) {
    const isPro = await this.isProUser(userId);

    // 1. Lấy thông tin Dataset
    const dataset = await this.prisma.dataset.findFirst({
      where: { id: datasetId, userId },
    });
    if (!dataset) {
      throw new NotFoundException('Dataset không tồn tại.');
    }

    if (!dataset.googleSpreadsheetId) {
      throw new BadRequestException('Dataset này không được liên kết với Google Sheets.');
    }

    // 2. Tải file từ Google
    const { buffer } = await this.downloadGoogleSheet(userId, dataset.googleSpreadsheetId);

    // Kiểm tra kích thước file
    const maxBytes = isPro ? PRO_LIMIT_BYTES : FREE_LIMIT_BYTES;
    const maxMb = maxBytes / 1024 / 1024;
    if (buffer.length > maxBytes) {
      throw new BadRequestException(
        `Dữ liệu Google Sheet quá lớn. Giới hạn ${maxMb}MB cho plan ${isPro ? 'Pro' : 'Free'}.`,
      );
    }

    // 3. Ghi đè file cũ trên MinIO
    await this.storage.putObject(
      dataset.minioKey,
      buffer,
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );

    // 4. Cập nhật cơ sở dữ liệu
    const updatedDataset = await this.prisma.dataset.update({
      where: { id: datasetId },
      data: {
        sizeBytes: buffer.length,
        lastSyncedAt: new Date(),
      },
    });

    // 5. Ghi Audit Log
    await this.auditLogs.log({
      userId,
      action: 'dataset.sync',
      entity: 'Dataset',
      entityId: datasetId,
      metadata: { name: dataset.name, spreadsheetId: dataset.googleSpreadsheetId },
    });

    return updatedDataset;
  }

  private async downloadGoogleSheet(userId: string, spreadsheetId: string): Promise<{ buffer: Buffer; filename: string }> {
    const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=xlsx`;
    let response: globalThis.Response = null as any;
    let isPublic = true;
    try {
      response = await fetch(exportUrl);
      if (!response.ok) {
        isPublic = false;
      }
    } catch (err) {
      isPublic = false;
    }

    if (!isPublic) {
      const accessToken = await this.authService.getGoogleAccessToken(userId);
      try {
        response = await fetch(exportUrl, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
      } catch (err) {
        throw new BadRequestException('Không thể kết nối đến Google Sheets API.');
      }

      if (!response.ok) {
        throw new BadRequestException(
          'Không thể truy cập Google Sheet. Hãy đảm bảo tài khoản Google của bạn có quyền xem tài liệu này.',
        );
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let filename = `Google Sheet ${spreadsheetId}.xlsx`;
    const contentDisp = response.headers.get('content-disposition');
    if (contentDisp) {
      const fnMatch = contentDisp.match(/filename="?([^"]+)"?/);
      if (fnMatch) {
        filename = fnMatch[1];
        if (!filename.endsWith('.xlsx')) {
          filename += '.xlsx';
        }
      }
    }

    return { buffer, filename };
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
