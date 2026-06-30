import { Link } from 'react-router-dom';
import Header from '../components/Header';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-gray-900 p-8 text-center shadow-2xl backdrop-blur-sm">
          <div className="py-6">
            <div className="w-16 h-16 bg-red-950 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl border border-red-800">
              ✕
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Thanh toán đã bị hủy</h2>
            <p className="text-sm text-gray-400 mb-8">
              Yêu cầu thanh toán của bạn đã bị hủy. Bạn sẽ không bị trừ bất kỳ khoản phí nào.
            </p>
            <div className="space-y-3">
              <Link
                to="/pricing"
                className="inline-flex w-full justify-center rounded-xl bg-purple-600 hover:bg-purple-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/20 transition"
              >
                Quay lại bảng giá
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex w-full justify-center rounded-xl border border-gray-700 hover:bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-400 hover:text-white transition"
              >
                Quay lại Dashboard
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
