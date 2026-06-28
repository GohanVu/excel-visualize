import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileUpload from './FileUpload';
import { uploadFile } from '../api/datasets';

vi.mock('../api/datasets', () => ({
  uploadFile: vi.fn(),
}));

const mockUploadFile = uploadFile as ReturnType<typeof vi.fn>;

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

function makeFile(name: string, type: string, size = 1024) {
  return new File(['x'.repeat(size)], name, { type });
}

function getInput() {
  return screen.getByTestId('file-input') as HTMLInputElement;
}

describe('FileUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders drop zone with instructions', () => {
    render(<FileUpload onSuccess={() => {}} />);
    expect(screen.getByText(/kéo thả file/i)).toBeInTheDocument();
  });

  it('shows accepted file types', () => {
    render(<FileUpload onSuccess={() => {}} />);
    expect(screen.getByText(/\.xlsx/i)).toBeInTheDocument();
  });

  it('shows file name and size after valid file selected', () => {
    render(<FileUpload onSuccess={() => {}} />);
    fireEvent.change(getInput(), {
      target: { files: [makeFile('report.xlsx', XLSX_MIME)] },
    });
    expect(screen.getByText('report.xlsx')).toBeInTheDocument();
  });

  it('shows error for invalid file type', () => {
    render(<FileUpload onSuccess={() => {}} />);
    fireEvent.change(getInput(), {
      target: { files: [makeFile('doc.pdf', 'application/pdf')] },
    });
    expect(screen.getByRole('alert')).toHaveTextContent(/chỉ chấp nhận/i);
  });

  it('shows upload button after valid file selected', () => {
    render(<FileUpload onSuccess={() => {}} />);
    fireEvent.change(getInput(), {
      target: { files: [makeFile('data.csv', 'text/csv')] },
    });
    expect(screen.getByRole('button', { name: 'Upload file' })).toBeInTheDocument();
  });

  it('shows the backend error message (e.g. quota) on upload failure', async () => {
    // Lỗi kiểu axios: message thật nằm ở response.data.message
    mockUploadFile.mockRejectedValue({
      response: { data: { message: 'Đã đạt giới hạn 2 sheet (gói Free). Xoá bớt sheet để thêm mới.' } },
    });
    render(<FileUpload onSuccess={() => {}} />);
    fireEvent.change(getInput(), {
      target: { files: [makeFile('data.csv', 'text/csv')] },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Upload file' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/giới hạn 2 sheet/i);
  });
});
