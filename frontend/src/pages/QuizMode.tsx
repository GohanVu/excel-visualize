import { useState, useEffect, useMemo } from 'react';
import type { DatasetColumn } from '../api/datasets';

function nonEmpty(v: string | undefined): boolean {
  return (v ?? '').toString().trim() !== '';
}

function shuffleArr<T>(a: T[]): void {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
}

// Đáp án đúng + tối đa 3 nhiễu (giá trị distinct từ dòng khác), xáo trộn
function buildOptions(
  rows: Record<string, string>[],
  deck: number[],
  pos: number,
  answerCol: string,
): string[] {
  if (deck.length === 0) return [];
  const correct = (rows[deck[pos]][answerCol] ?? '').toString();
  const pool = [
    ...new Set(
      deck
        .map((i) => (rows[i][answerCol] ?? '').toString())
        .filter((v) => v && v !== correct),
    ),
  ];
  shuffleArr(pool);
  const opts = [correct, ...pool.slice(0, 3)];
  shuffleArr(opts);
  return opts;
}

export default function QuizMode({
  columns,
  rows,
}: {
  columns: DatasetColumn[];
  rows: Record<string, string>[];
}) {
  const names = columns.map((c) => c.name);
  const textNames = columns
    .filter((c) => c.type === 'string' || c.type === 'category')
    .map((c) => c.name);
  const defaultQ = textNames[0] ?? names[0];
  const defaultA =
    textNames.find((n) => n !== defaultQ) ??
    names.find((n) => n !== defaultQ) ??
    names[0];

  const [question, setQuestion] = useState(defaultQ);
  const [answer, setAnswer] = useState(defaultA);
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, answered: 0 });

  // Thẻ hợp lệ: có cả cột câu hỏi và đáp án
  const deck = useMemo(
    () =>
      rows
        .map((_, i) => i)
        .filter((i) => nonEmpty(rows[i][question]) && nonEmpty(rows[i][answer])),
    [rows, question, answer],
  );

  // Đổi cột → quiz mới → reset
  useEffect(() => {
    setPos(0);
    setPicked(null);
    setScore({ correct: 0, answered: 0 });
  }, [deck]);

  const total = deck.length;
  const correct = total > 0 ? (rows[deck[pos]][answer] ?? '').toString() : '';
  const questionText =
    total > 0 ? (rows[deck[pos]][question] ?? '').toString() : '';
  const options = useMemo(
    () => buildOptions(rows, deck, pos, answer),
    [rows, deck, pos, answer],
  );

  function pick(opt: string) {
    if (picked != null) return;
    setPicked(opt);
    setScore((s) => ({
      correct: s.correct + (opt === correct ? 1 : 0),
      answered: s.answered + 1,
    }));
  }

  function next() {
    setPicked(null);
    setPos((p) => (total > 0 ? (p + 1) % total : 0));
  }

  return (
    <>
      <div className="mt-4 flex items-center justify-end">
        <span className="text-sm text-gray-400">
          Đúng{' '}
          <strong data-testid="quiz-score" className="text-green-400">
            {score.correct}
          </strong>{' '}
          / {score.answered}
        </span>
      </div>

      <div className="mt-2 grid gap-3 rounded-xl border border-gray-800 bg-gray-900 p-4 sm:grid-cols-2">
        <label className="text-sm">
          <span className="text-gray-400">Câu hỏi (cột)</span>
          <select
            aria-label="Cột câu hỏi"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1.5 text-sm text-white"
          >
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-gray-400">Đáp án (cột)</span>
          <select
            aria-label="Cột đáp án"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            className="mt-1 w-full rounded bg-gray-800 px-2 py-1.5 text-sm text-white"
          >
            {names
              .filter((n) => n !== question)
              .map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
          </select>
        </label>
      </div>

      {total === 0 ? (
        <p className="mt-6 text-gray-400">
          Không đủ dữ liệu để tạo quiz (cần cột câu hỏi + đáp án có giá trị).
        </p>
      ) : (
        <>
          <div className="mt-6 rounded-2xl border border-gray-700 bg-gray-900 p-6 text-center">
            <div className="text-2xl font-bold">{questionText}</div>
            <div className="mt-1 text-xs text-gray-500">
              {question} → {answer}?
            </div>
          </div>

          <div className="mt-4 grid gap-2">
            {options.map((opt, i) => {
              let cls = 'bg-gray-800 hover:bg-gray-700';
              if (picked != null) {
                if (opt === correct) cls = 'bg-green-600';
                else if (opt === picked) cls = 'bg-red-600';
                else cls = 'bg-gray-800 opacity-60';
              }
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked != null}
                  onClick={() => pick(opt)}
                  className={`rounded-lg px-4 py-3 text-left text-sm transition ${cls}`}
                >
                  {opt || '—'}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-400">
              {pos + 1} / {total}
            </span>
            <button
              type="button"
              onClick={next}
              disabled={picked == null}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-40"
            >
              Câu tiếp →
            </button>
          </div>
        </>
      )}
    </>
  );
}
