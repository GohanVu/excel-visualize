import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import FileUpload from '../components/FileUpload';
import { importGoogleSheet } from '../api/datasets';
import { apiErrorMessage } from '../lib/apiError';
import { useAuth } from '../hooks/useAuth';
import Header from '../components/Header';

export default function UploadPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'file' | 'google-sheet'>('file');
  const [sheetUrl, setSheetUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function handleSuccess(datasetId: string) {
    queryClient.invalidateQueries({ queryKey: ['datasets'] });
    navigate(`/datasets/${datasetId}/columns`);
  }

  const importMutation = useMutation({
    mutationFn: async (url: string) => {
      setErrorMsg(null);
      return importGoogleSheet(url);
    },
    onSuccess: (data) => {
      handleSuccess(data.id);
    },
    onError: (err) => {
      setErrorMsg(apiErrorMessage(err) || 'Kết nối Google Sheet thất bại. Vui lòng thử lại.');
    },
  });

  function handleGoogleSheetSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sheetUrl.trim()) return;
    importMutation.mutate(sheetUrl);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Header showBack />
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          <h1 className="text-2xl font-bold text-white mb-2">Thêm dữ liệu</h1>
        <p className="text-gray-400 mb-8">
          Chọn phương thức để bắt đầu phân tích và tạo biểu đồ
        </p>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-800 mb-8">
          <button
            onClick={() => setActiveTab('file')}
            className={`flex-1 pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'file'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            📁 Tải lên file Excel / CSV
          </button>
          <button
            onClick={() => setActiveTab('google-sheet')}
            className={`flex-1 pb-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'google-sheet'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            🟢 Kết nối Google Sheet
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'file' ? (
          <FileUpload onSuccess={handleSuccess} />
        ) : (
          <div className="space-y-6">
            <form onSubmit={handleGoogleSheetSubmit} className="space-y-4" role="form" aria-label="google-sheet-form">
              <div className="space-y-2">
                <label htmlFor="sheet-url" className="text-sm font-medium text-gray-300">
                  Đường dẫn Google Sheet
                </label>
                <input
                  id="sheet-url"
                  type="text"
                  placeholder="https://docs.google.com/spreadsheets/d/.../edit"
                  value={sheetUrl}
                  onChange={(e) => setSheetUrl(e.target.value)}
                  disabled={importMutation.isPending}
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-600 disabled:opacity-50"
                />
              </div>

              {/* Trạng thái kết nối Google Accounts */}
              {user && (
                <div className={`text-xs px-4 py-3 rounded-xl border flex items-center justify-between ${
                  user.googleConnected
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400'
                    : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                }`}>
                  <span>
                    {user.googleConnected
                      ? '🟢 Đã liên kết tài khoản Google (hỗ trợ cả Sheet riêng tư)'
                      : '🔒 Chưa liên kết Google (chỉ import được Sheet công khai)'}
                  </span>
                  {!user.googleConnected && (
                    <a
                      href="/api/auth/google/sheets"
                      className="text-blue-400 hover:text-blue-300 font-semibold underline decoration-1"
                    >
                      Kết nối ngay
                    </a>
                  )}
                </div>
              )}

              {errorMsg && (
                <div role="alert" className="text-sm text-red-400 bg-red-500/5 border border-red-500/20 px-4 py-3 rounded-xl">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={importMutation.isPending || !sheetUrl.trim()}
                className="w-full py-3 rounded-xl text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:hover:bg-blue-600 flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/10"
              >
                {importMutation.isPending ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Đang kết nối...</span>
                  </>
                ) : (
                  <span>Kết nối dữ liệu</span>
                )}
              </button>
            </form>

            {/* Instruction Card */}
            <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-5 space-y-3">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-1">
                <span>💡 Hướng dẫn chia sẻ công khai</span>
              </h3>
              <ul className="text-xs text-gray-400 list-decimal pl-4 space-y-2 leading-relaxed">
                <li>Mở trang tính Google Sheet của bạn.</li>
                <li>Bấm nút <strong>Chia sẻ</strong> (Share) ở góc trên bên phải.</li>
                <li>Trong mục <strong>Truy cập chung</strong> (General access), chuyển từ <strong>Hạn chế</strong> (Restricted) sang <strong>Bất kỳ ai có liên kết</strong> (Anyone with the link).</li>
                <li>Đảm bảo vai trò được đặt là <strong>Người xem</strong> (Viewer).</li>
                <li>Sao chép đường dẫn trên thanh địa chỉ hoặc bấm <strong>Sao chép đường dẫn</strong> rồi dán vào ô nhập liệu ở trên.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
      </main>
    </div>
  );
}
