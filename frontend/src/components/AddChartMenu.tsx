import { useState } from 'react';
import type { Dataset } from '../api/datasets';

interface Props {
  datasets: Dataset[];
  onPick: (datasetId: string) => void; // chọn sheet sẵn có → vào flow cột/gợi ý
  onUpload: () => void; // tải sheet mới
}

// Nút "Thêm biểu đồ" trên dashboard (P2-T2): mở menu chọn sheet để dựng chart mới
// rồi lưu vào dashboard đang mở. Re-trigger flow từ /columns của sheet đã chọn.
export default function AddChartMenu({ datasets, onPick, onUpload }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium transition hover:bg-blue-500"
      >
        + Thêm biểu đồ
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            aria-hidden="true"
            onClick={() => setOpen(false)}
          />
          <div
            role="menu"
            aria-label="Chọn sheet để thêm biểu đồ"
            className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-gray-800 bg-gray-900 shadow-xl"
          >
            {datasets.length > 0 ? (
              <div className="max-h-60 overflow-y-auto py-1">
                <p className="px-3 py-1 text-xs text-gray-500">Từ sheet đã có</p>
                {datasets.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setOpen(false);
                      onPick(d.id);
                    }}
                    className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-gray-800"
                  >
                    📄 {d.name}
                  </button>
                ))}
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-gray-500">Chưa có sheet nào</p>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onUpload();
              }}
              className="block w-full border-t border-gray-800 px-3 py-2 text-left text-sm text-gray-300 hover:bg-gray-800"
            >
              ⬆ Tải sheet mới
            </button>
          </div>
        </>
      )}
    </div>
  );
}
