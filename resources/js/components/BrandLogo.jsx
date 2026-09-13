import React from 'react';
import generatedLogo from '../../images/e-absensi-logo-generated.png';

export default function BrandLogo({ className = 'h-12 w-12', title = 'Logo e-Absensi' }) {
    return <img src={generatedLogo} className={`${className} object-contain`} alt={title} />;
}
