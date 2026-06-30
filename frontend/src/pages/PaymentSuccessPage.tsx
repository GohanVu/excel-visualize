import { useEffect, useState, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Header from '../components/Header';
import { getTransactionStatus } from '../api/payments';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderCodeStr = searchParams.get('orderCode');
  const orderCode = orderCodeStr ? parseInt(orderCodeStr, 10) : null;
  const queryClient = useQueryClient();

  const [status, setStatus] = useState<'LOADING' | 'PAID' | 'PENDING' | 'ERROR'>('LOADING');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 10; // Thử tối đa 10 lần (~15s)
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!orderCode) {
      setStatus('ERROR');
      return;
    }

    async function checkStatus() {
      try {
        const data = await getTransactionStatus(orderCode!);
        if (data.status === 'PAID') {
          setStatus('PAID');
          // Invalidate cache query user info để cập nhật hạn dùng Pro
          queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
        } else if (data.status === 'CANCELLED') {
          setStatus('ERROR');
        } else {
          // Trạng thái PENDING, tiếp tục check nếu chưa quá giới hạn
          if (attempts < maxAttempts) {
            timerRef.current = setTimeout(() => {
              setAttempts((prev) => prev + 1);
            }, 1500);
          } else {
            setStatus('PENDING'); // Dừng polling, chuyển sang hiển thị nút check thủ công
          }
        }
      } catch (err) {
        setStatus('ERROR');
      }
    }

    checkStatus();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [orderCode, attempts, queryClient]);

  async function handleCheckStatus() {
    if (!orderCode) return;
    setStatus('LOADING');
    try {
      const data = await getTransactionStatus(orderCode);
      if (data.status === 'PAID') {
        setStatus('PAID');
        queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      } else {
        setStatus('PENDING');
      }
    } catch {
      setStatus('ERROR');
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl backdrop-blur-sm">
          {status === 'LOADING' && (
            <div className="py-8">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <h2 className="text-xl font-bold text-white mb-2">Đang xác nhận giao dịch...</h2>
              <p className="text-sm text-gray-400">Hệ thống đang kiểm tra biến động số dư ngân hàng.</p>
            </div>
          )}

          {status === 'PAID' && (
            <div className="py-6">
              <div className="w-16 h-16 bg-green-950 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl border border-green-800 animate-bounce">
                ✓
              </div>
              <h2 className="text-2xl font-bold text-white mb-2 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                Thanh Toán Thành Công!
              </h2>
              <p className="text-sm text-gray-400 mb-8">
                Tài khoản của bạn đã được nâng cấp lên **Pro**. Hãy khám phá ngay các tính năng đặc quyền!
              </p>
              <Link
                to="/dashboard"
                className="inline-flex w-full justify-center rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition"
              >
                Quay lại Dashboard
              </Link>
            </div>
          )}

          {status === 'PENDING' && (
            <div className="py-6">
              <div className="w-16 h-16 bg-yellow-950 text-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl border border-yellow-800">
                ⏳
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Giao dịch đang được xử lý</h2>
              <p className="text-sm text-gray-400 mb-6">
                Chuyển khoản có thể mất một vài phút để được ngân hàng xác nhận. Nếu bạn đã chuyển tiền, hãy thử kiểm tra lại.
              </p>
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleCheckStatus}
                  className="w-full rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition"
                >
                  Tôi đã chuyển khoản - Kiểm tra lại
                </button>
                <Link
                  to="/dashboard"
                  className="inline-flex w-full justify-center rounded-xl border border-gray-700 hover:bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-400 hover:text-white transition"
                >
                  Quay lại Dashboard
                </Link>
              </div>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="py-6">
              <div className="w-16 h-16 bg-red-950 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl border border-red-800">
                ✕
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Giao dịch thất bại hoặc đã hủy</h2>
              <p className="text-sm text-gray-400 mb-8">
                Đã có lỗi xảy ra hoặc yêu cầu thanh toán của bạn đã bị hủy bỏ.
              </p>
              <div className="space-y-3">
                <Link
                  to="/pricing"
                  className="inline-flex w-full justify-center rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 text-sm font-semibold text-white transition"
                >
                  Thử thanh toán lại
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-flex w-full justify-center rounded-xl border border-gray-700 hover:bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-400 hover:text-white transition"
                >
                  Quay lại Dashboard
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
