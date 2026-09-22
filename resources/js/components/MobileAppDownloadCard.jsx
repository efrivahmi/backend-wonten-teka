import React, { useEffect, useState } from 'react';
import { Download, FlaskConical, ShieldCheck, Smartphone } from 'lucide-react';

const fallbackRelease = {
    version: '1.0.0+1',
    file: 'e-Absensi_Mobile.apk',
};

export default function MobileAppDownloadCard({ audience = 'karyawan' }) {
    const [release, setRelease] = useState(fallbackRelease);

    useEffect(() => {
        fetch('/downloads/mobile-app.json', { cache: 'no-store' })
            .then(response => response.ok ? response.json() : Promise.reject())
            .then(data => setRelease({ ...fallbackRelease, ...data }))
            .catch(() => setRelease(fallbackRelease));
    }, []);

    const apkUrl = `/downloads/${encodeURIComponent(release.file)}?v=${encodeURIComponent(release.version)}`;

    return (
        <section className="overflow-hidden rounded-[1.75rem] border border-emerald-200 bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-700 text-white shadow-sm">
            <div className="grid gap-6 p-6 sm:p-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex items-start gap-4">
                    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/12 ring-1 ring-white/15">
                        <Smartphone className="h-7 w-7 text-lime-300" />
                    </span>
                    <div>
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="text-xs font-black uppercase tracking-[0.18em] text-lime-300">Aplikasi Android resmi</p>
                            <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-300/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-amber-100">
                                <FlaskConical className="h-3 w-3" /> Beta / dalam pengembangan
                            </span>
                        </div>
                        <h2 className="mt-2 text-xl font-black tracking-tight sm:text-2xl">e-Absensi Lemdiklat Taruna Nusantara Indonesia</h2>
                        <p className="mt-2 max-w-2xl text-sm leading-6 text-emerald-100">
                            {audience === 'admin'
                                ? 'Unduh aplikasi mobile untuk mengakses dashboard admin dan pemantauan operasional dari perangkat Android.'
                                : 'Unduh aplikasi mobile untuk absensi, melihat jadwal, riwayat kehadiran, dan pengajuan dari perangkat Android.'}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-emerald-100">
                            <span className="rounded-full bg-white/10 px-3 py-1.5">Android</span>
                            <span className="rounded-full bg-white/10 px-3 py-1.5">Versi {release.version}</span>
                            <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5" /> Sumber resmi</span>
                        </div>
                        <p className="mt-4 max-w-2xl text-xs leading-5 text-emerald-200">
                            Aplikasi masih dalam tahap beta. Beberapa fitur dapat berubah dan hasil absensi tetap tersimpan di backend yang sama dengan website.
                        </p>
                        <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-emerald-50">✓ Tersedia: absensi, jadwal, pengajuan, dan riwayat</div>
                            <div className="rounded-xl border border-amber-200/20 bg-amber-200/10 px-3 py-2 text-amber-50">↗ Dikembangkan: notifikasi event, kalender perangkat, dan penyempurnaan biometric</div>
                        </div>
                    </div>
                </div>
                <a
                    href={apkUrl}
                    download={release.file}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-emerald-950 transition hover:bg-lime-200 focus:outline-none focus:ring-4 focus:ring-lime-200/40"
                >
                    <Download className="h-5 w-5" />
                    Download versi beta
                </a>
            </div>
        </section>
    );
}
