'use client';

import { PrintIcon } from '@/components/ui/Icons';

export function PrintButton({ label = '打印 / 存为 PDF' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-md border border-line-strong px-3 py-1.5 text-[0.8125rem] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
    >
      <PrintIcon size={14} />
      {label}
    </button>
  );
}
