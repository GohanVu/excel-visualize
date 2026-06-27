import { useState, useRef, DragEvent } from 'react';
import { uploadFile } from '../api/datasets';

interface Props {
  onSuccess: (datasetId: string) => void;
}

const ALLOWED_MIME = [
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];
const ALLOWED_EXT = ['.xlsx', '.xls', '.csv'];

function validate(file: File): string | null {
  const hasValidMime = ALLOWED_MIME.includes(file.type);
  const hasValidExt = ALLOWED_EXT.some((ext) => file.name.toLowerCase().endsWith(ext));
  if (!hasValidMime && !hasValidExt) return 'Chỉ chấp nhận file .xlsx, .xls, .csv';
  if (file.size > 50 * 1024 * 1024) return 'File quá lớn (tối đa 50MB)';
  return null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function FileUpload({ onSuccess }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    const err = validate(f);
    if (err) { setError(err); setFile(null); return; }
    setFile(f);
    setError(null);
  }

  function onDragOver(e: DragEvent) { e.preventDefault(); setIsDragging(true); }
  function onDragLeave() { setIsDragging(false); }
  function onDrop(e: DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const dataset = await uploadFile(file);
      onSuccess(dataset.id);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Upload thất bại, thử lại nhé';
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="w-full">
      <div
        role="button"
        aria-label="Vùng upload file"
        tabIndex={0}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors outline-none
          ${isDragging ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 hover:border-gray-400'}
          focus-visible:ring-2 focus-visible:ring-blue-500`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_EXT.join(',')}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          data-testid="file-input"
        />
        {file ? (
          <div>
            <p className="text-white font-medium truncate">{file.name}</p>
            <p className="text-gray-400 text-sm mt-1">{formatSize(file.size)}</p>
          </div>
        ) : (
          <div>
            <p className="text-gray-300 font-medium">Kéo thả file vào đây</p>
            <p className="text-gray-500 text-sm mt-2">hoặc click để chọn file</p>
            <p className="text-gray-600 text-xs mt-3">
              .xlsx · .xls · .csv &nbsp;·&nbsp; Tối đa 10MB (Free) / 50MB (Pro)
            </p>
          </div>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-red-400 text-sm">
          {error}
        </p>
      )}

      {file && !uploading && (
        <button
          onClick={handleUpload}
          className="mt-4 w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
        >
          Upload file
        </button>
      )}

      {uploading && (
        <div className="mt-4 w-full py-2.5 rounded-lg bg-blue-800 text-white text-center font-medium opacity-70">
          Đang upload...
        </div>
      )}
    </div>
  );
}
