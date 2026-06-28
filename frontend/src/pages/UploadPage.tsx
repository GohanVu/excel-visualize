import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import FileUpload from '../components/FileUpload';

export default function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function handleSuccess(datasetId: string) {
    // Đánh dấu list sheet stale → trang chủ refetch, hiện ngay file mới
    // (không phải chờ staleTime 30s / F5)
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
    navigate(`/datasets/${datasetId}/columns`);
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Upload dữ liệu</h1>
        <p className="text-gray-400 mb-8">
          Upload file Excel hoặc CSV để bắt đầu tạo chart
        </p>
        <FileUpload onSuccess={handleSuccess} />
      </div>
    </div>
  );
}
