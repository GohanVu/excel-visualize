import { useState } from 'react';
import Header from '../components/Header';
import { createPaymentLink } from '../api/payments';
import { useAuth } from '../hooks/useAuth';

interface PricingPackage {
  months: number;
  price: number;
  label: string;
  saving?: string;
  popular?: boolean;
}

export default function PricingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<number | null>(null);
  const [error, setError] = useState('');

  const packages: PricingPackage[] = [
    {
      months: 1,
      price: 99000,
      label: 'Gói 1 Tháng',
    },
    {
      months: 3,
      price: 249000,
      label: 'Gói 3 Tháng',
      saving: 'Tiết kiệm 15%',
    },
    {
      months: 6,
      price: 449000,
      label: 'Gói 6 Tháng',
      saving: 'Tiết kiệm 25%',
      popular: true,
    },
    {
      months: 12,
      price: 799000,
      label: 'Gói 1 Năm',
      saving: 'Tiết kiệm 33%',
    },
  ];

  async function handleUpgrade(months: number) {
    setError('');
    setLoading(months);
    try {
      const response = await createPaymentLink(months);
      // Chuyển hướng người dùng sang trang thanh toán PayOS (chứa mã VietQR động)
      window.location.href = response.checkoutUrl;
    } catch (err) {
      setError('Không thể khởi tạo thanh toán. Vui lòng thử lại sau.');
      setLoading(null);
    }
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      <Header showBack={true} />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
            Nâng Cấp Tài Khoản Pro
          </h1>
          <p className="mt-4 text-lg text-gray-400">
            Mở khóa toàn bộ sức mạnh của AI Insight tiếng Việt, phân tích không giới hạn và tự động hóa dữ liệu biểu đồ.
          </p>
        </div>

        {error && (
          <div className="mb-8 p-4 rounded-xl bg-red-950/50 border border-red-900 text-red-400 text-center text-sm max-w-md mx-auto">
            {error}
          </div>
        )}

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {packages.map((pkg) => (
            <div
              key={pkg.months}
              className={`relative flex flex-col rounded-2xl bg-gray-900 border p-6 shadow-xl transition-all duration-300 hover:translate-y-[-4px] ${
                pkg.popular
                  ? 'border-purple-500 ring-2 ring-purple-500/20'
                  : 'border-gray-800 hover:border-gray-700'
              }`}
            >
              {pkg.popular && (
                <span className="absolute top-0 right-6 translate-y-[-50%] rounded-full bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-0.5 text-xs font-semibold text-white uppercase tracking-wider">
                  Phổ biến nhất
                </span>
              )}

              {pkg.saving && (
                <span className="absolute top-3 left-6 rounded bg-purple-950 text-purple-400 px-2 py-0.5 text-xs font-medium border border-purple-900">
                  {pkg.saving}
                </span>
              )}

              <div className={pkg.saving ? 'mt-4' : ''}>
                <h3 className="text-lg font-semibold text-white">{pkg.label}</h3>
                <div className="mt-4 flex items-baseline text-white">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {formatPrice(pkg.price)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-500">Thanh toán một lần qua VietQR</p>
              </div>

              <div className="mt-6 flex-1 flex flex-col justify-end">
                <button
                  type="button"
                  disabled={loading !== null}
                  onClick={() => handleUpgrade(pkg.months)}
                  className={`w-full rounded-xl py-3 px-4 text-center text-sm font-semibold transition ${
                    pkg.popular
                      ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading === pkg.months ? 'Đang tạo QR...' : user?.subscription?.plan === 'pro' ? 'Gia hạn ngay' : 'Nâng cấp ngay'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="border border-gray-800 bg-gray-900/50 rounded-2xl p-8 max-w-4xl w-full mx-auto backdrop-blur-sm">
          <h2 className="text-xl font-bold text-white mb-6 text-center">So sánh quyền lợi gói dịch vụ</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
            <div>
              <h3 className="font-semibold text-gray-400 mb-3 uppercase tracking-wider text-xs">Gói Free</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-500">
                  <span className="mr-2">❌</span> Suggest rule-based tối đa 2 gợi ý
                </li>
                <li className="flex items-center text-gray-500">
                  <span className="mr-2">❌</span> Không có AI insight / nhận xét tiếng Việt
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mr-2">✓</span> Giới hạn tối đa 3 chart / 1 dashboard
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mr-2">✓</span> Giới hạn tối đa 2 datasets (bảng dữ liệu)
                </li>
                <li className="flex items-center text-gray-400">
                  <span className="mr-2">✓</span> Quét cập nhật Google Sheet thủ công
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-purple-400 mb-3 uppercase tracking-wider text-xs">Gói Pro</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-200">
                  <span className="mr-2">✨</span> 4 gợi ý AI + Insight tiếng Việt sắc sảo
                </li>
                <li className="flex items-center text-gray-200">
                  <span className="mr-2">✨</span> Không giới hạn số lượng biểu đồ & dashboard
                </li>
                <li className="flex items-center text-gray-200">
                  <span className="mr-2">✨</span> Không giới hạn số lượng datasets lưu trữ
                </li>
                <li className="flex items-center text-gray-200">
                  <span className="mr-2">✨</span> Tự động đồng bộ hóa Google Sheets theo giờ
                </li>
                <li className="flex items-center text-gray-200">
                  <span className="mr-2">✨</span> Hỗ trợ tải biểu đồ chất lượng cao PNG/PDF
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
