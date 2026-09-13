import React from 'react';

export default function BrandLogo({ className = 'h-12 w-12', title = 'Logo e-Absensi' }) {
    return <svg className={className} viewBox="0 0 240 240" role="img" aria-label={title} xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="brand-logo-gradient" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#059669"/><stop offset="1" stopColor="#166534"/></linearGradient></defs>
        <rect width="240" height="240" rx="56" fill="url(#brand-logo-gradient)"/>
        <path d="M67 91V72c0-8 7-15 15-15h20M173 91V72c0-8-7-15-15-15h-20M67 149v19c0 8 7 15 15 15h20M173 149v19c0 8-7 15-15 15h-20" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round"/>
        <circle cx="120" cy="112" r="28" fill="#dcfce7"/>
        <path d="M78 177c7-24 23-36 42-36s35 12 42 36" fill="#dcfce7"/>
        <path d="M93 115c8 7 17 10 27 10s19-3 27-10" fill="none" stroke="#047857" strokeWidth="6" strokeLinecap="round"/>
        <circle cx="108" cy="105" r="4" fill="#047857"/><circle cx="132" cy="105" r="4" fill="#047857"/>
    </svg>;
}
