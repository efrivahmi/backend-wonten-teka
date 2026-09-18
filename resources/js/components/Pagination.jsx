import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ pagination, onPageChange }) {
    if (!pagination || pagination.last_page <= 1) return null;

    const { current_page, last_page, total, from, to } = pagination;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 px-4 py-4 sm:px-6 mt-4">
            <div className="hidden sm:block">
                <p className="text-sm text-slate-700">
                    Menampilkan <span className="font-bold text-slate-900">{from || 0}</span> sampai <span className="font-bold text-slate-900">{to || 0}</span> dari <span className="font-bold text-slate-900">{total}</span> data
                </p>
            </div>
            <div className="flex flex-1 justify-between sm:justify-end gap-2 w-full sm:w-auto">
                <button
                    onClick={() => onPageChange(current_page - 1)}
                    disabled={current_page === 1}
                    className="relative inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                    <ChevronLeft className="h-4 w-4 text-slate-500" />
                    <span>Sebelumnya</span>
                </button>
                <div className="flex items-center justify-center sm:hidden">
                    <span className="text-sm font-semibold text-slate-700">{current_page} / {last_page}</span>
                </div>
                <button
                    onClick={() => onPageChange(current_page + 1)}
                    disabled={current_page === last_page}
                    className="relative inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                    <span>Selanjutnya</span>
                    <ChevronRight className="h-4 w-4 text-slate-500" />
                </button>
            </div>
        </div>
    );
}
