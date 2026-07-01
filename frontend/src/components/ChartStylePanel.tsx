import { useState } from 'react';
import type { DashboardChart } from '../api/charts';
import {
  PALETTES,
  THEMES,
  applyCustomization,
  paletteColors,
  readStyle,
  type ChartStyle,
  type ThemeKey,
} from '../lib/chartCustomize';
import { isDefinitionConfig, resolveChartOption } from '../lib/chart/chartConfigAdapter';
import ChartView from './ChartView';

interface Props {
  chart: DashboardChart;
  saving: boolean;
  onClose: () => void;
  onSave: (patch: { title: string; config: Record<string, unknown> }) => void;
}

// Panel tuỳ chỉnh (P2-T5): đổi tiêu đề, bảng màu, nền sáng/tối — preview trực tiếp.
export default function ChartStylePanel({ chart, saving, onClose, onSave }: Props) {
  // Chart v2 lưu option trong config.option; chart cũ config chính là option.
  const baseOption = resolveChartOption(chart.config);
  const [title, setTitle] = useState(chart.title ?? '');
  const [style, setStyle] = useState<ChartStyle>(() => readStyle(baseOption));

  const preview = applyCustomization(baseOption, style);

  function save() {
    // v2: giữ definition + version, chỉ cập nhật option cache. Cũ: lưu option thô.
    const customized = applyCustomization(baseOption, style);
    const config = isDefinitionConfig(chart.config)
      ? { ...(chart.config as Record<string, unknown>), option: customized }
      : customized;
    onSave({ title: title.trim(), config });
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div
        className="absolute inset-0 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-label="Tuỳ chỉnh biểu đồ"
        className="relative z-10 flex h-full w-80 flex-col gap-5 overflow-y-auto border-l border-gray-800 bg-gray-900 p-5"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold">Tuỳ chỉnh biểu đồ</h3>
          <button
            type="button"
            aria-label="Đóng"
            onClick={onClose}
            className="rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-gray-400">Tiêu đề</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Biểu đồ"
            className="rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 text-white outline-none focus:border-gray-500"
          />
        </label>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 text-gray-400">Bảng màu</legend>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(PALETTES).map(([key, p]) => (
              <button
                key={key}
                type="button"
                aria-pressed={style.palette === key}
                onClick={() => setStyle((s) => ({ ...s, palette: key }))}
                className={`flex flex-col gap-1.5 rounded-lg border p-2 text-left transition ${
                  style.palette === key
                    ? 'border-blue-500 bg-gray-800'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                <span className="text-xs">{p.label}</span>
                <span className="flex gap-1">
                  {paletteColors(key)
                    .slice(0, 5)
                    .map((c, i) => (
                      <span
                        key={i}
                        style={{ backgroundColor: c }}
                        className="h-3 w-3 rounded-full"
                      />
                    ))}
                </span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-2 text-sm">
          <legend className="mb-1 text-gray-400">Nền</legend>
          <div role="group" aria-label="Nền" className="flex gap-2">
            {(Object.keys(THEMES) as ThemeKey[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={style.theme === key}
                onClick={() => setStyle((s) => ({ ...s, theme: key }))}
                className={`flex-1 rounded-lg border px-3 py-2 transition ${
                  style.theme === key
                    ? 'border-blue-500 bg-gray-800'
                    : 'border-gray-700 hover:border-gray-500'
                }`}
              >
                {THEMES[key].label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="rounded-lg border border-gray-800 p-2">
          <ChartView option={preview} height={180} />
        </div>

        <div className="mt-auto flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-60"
          >
            {saving ? 'Đang lưu…' : 'Lưu'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-700 px-3 py-2 text-sm hover:bg-gray-600"
          >
            Huỷ
          </button>
        </div>
      </aside>
    </div>
  );
}
