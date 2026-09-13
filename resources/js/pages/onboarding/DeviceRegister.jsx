import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, Loader2, AlertCircle } from 'lucide-react';
import api from '../../api';
import { getDeviceFingerprint, saveDeviceFingerprint } from '../../deviceIdentity';

const DeviceRegister = () => {
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState(null);
    const [fingerprint, setFingerprint] = useState('');
    const [deviceLabel, setDeviceLabel] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const checkDevice = async () => {
            try {
                const fpId = await getDeviceFingerprint();
                setFingerprint(fpId);

                // Check status
                const response = await api.get('/device/status', {
                    params: { device_fingerprint: fpId }
                });

                if (response.data.device) {
                    const status = response.data.device.status;
                    if (status === 'active') {
                        const userStr = localStorage.getItem('user');
                        const userObj = userStr ? JSON.parse(userStr) : null;
                        if (userObj && userObj.is_super_admin) {
                            navigate('/admin/dashboard');
                        } else {
                            navigate('/employee/dashboard');
                        }
                    } else if (status === 'pending_approval') {
                        navigate('/onboarding/device-pending');
                    }
                }
            } catch (err) {
                // 404 means not registered, which is fine, we let them register
                if (err.response?.status !== 404) {
                    setError('Gagal memeriksa status perangkat.');
                }
            } finally {
                setLoading(false);
            }
        };

        checkDevice();
    }, [navigate]);

    const getDeviceInfo = () => {
        const ua = navigator.userAgent;
        let browser = "Web Browser";
        let os = "Unknown OS";
        let deviceModel = "";

        if (ua.includes("Firefox")) browser = "Firefox";
        else if (ua.includes("SamsungBrowser")) browser = "Samsung Internet";
        else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
        else if (ua.includes("Edge") || ua.includes("Edg")) browser = "Edge";
        else if (ua.includes("Chrome")) browser = "Chrome";
        else if (ua.includes("Safari")) browser = "Safari";

        if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
        else if (ua.includes("Windows NT 6.3")) os = "Windows 8.1";
        else if (ua.includes("Windows NT 6.2")) os = "Windows 8";
        else if (ua.includes("Windows NT 6.1")) os = "Windows 7";
        else if (ua.includes("Mac OS X")) os = "Mac OS";
        else if (ua.includes("Android")) {
            const match = ua.match(/Android\s([0-9\.]+)/);
            os = match ? `Android ${match[1]}` : "Android";
            // Simple extraction for Android device model
            const deviceMatch = ua.match(/\bAndroid[^;]*;(.*?)(?:Build|\))/i);
            if (deviceMatch && deviceMatch[1]) {
                deviceModel = deviceMatch[1].replace(/wv/g, '').trim();
            }
        }
        else if (ua.includes("iPhone")) { os = "iOS"; deviceModel = "iPhone"; }
        else if (ua.includes("iPad")) { os = "iOS"; deviceModel = "iPad"; }
        else if (ua.includes("Linux")) os = "Linux";

        let finalDeviceName = deviceModel ? `${deviceModel} (${browser})` : `${os} (${browser})`;
        
        return {
            deviceModel: finalDeviceName.substring(0, 80),
            osVersion: os.substring(0, 50)
        };
    };

    const handleRegister = async () => {
        const identityName = deviceLabel.trim();
        if (identityName.length < 3) {
            setError('Masukkan nama perangkat minimal 3 karakter.');
            return;
        }
        setRegistering(true);
        setError(null);
        try {
            const deviceInfo = getDeviceInfo();
            const response = await api.post('/device/register', {
                device_fingerprint: fingerprint,
                device_name: identityName,
                device_model: deviceInfo.deviceModel,
                os_version: deviceInfo.osVersion,
                app_version: 'web-1.0'
            });

            saveDeviceFingerprint(fingerprint);

            navigate(response.data.device?.status === 'active'
                ? '/employee/dashboard'
                : '/onboarding/device-pending');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal mendaftarkan perangkat.');
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full p-8 text-center">
                <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Laptop className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Daftarkan Perangkat Ini</h2>
                <p className="text-slate-600 mb-8 text-sm leading-relaxed">
                    Ajukan perangkat ini untuk dikaitkan ke akun Anda. Admin perlu menyetujuinya sebelum dashboard, absensi, dan fitur karyawan dapat diakses.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start text-left border border-red-100">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <div className="mb-6 text-left">
                    <label htmlFor="device-label" className="block text-sm font-semibold text-slate-700 mb-2">
                        Nama identitas perangkat
                    </label>
                    <input
                        id="device-label"
                        value={deviceLabel}
                        onChange={(event) => setDeviceLabel(event.target.value)}
                        maxLength={80}
                        placeholder="Contoh: Laptop Kantor Andi"
                        autoComplete="off"
                        className="w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-800 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none"
                    />
                    <p className="mt-2 text-xs text-slate-500">Nama ini akan terlihat oleh admin saat menyetujui perangkat.</p>
                </div>

                <button
                    onClick={handleRegister}
                    disabled={registering || deviceLabel.trim().length < 3}
                    className="w-full bg-emerald-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-emerald-700 transition flex justify-center items-center"
                >
                    {registering ? <Loader2 className="animate-spin h-5 w-5" /> : 'Ajukan Perangkat'}
                </button>
            </div>
        </div>
    );
};

export default DeviceRegister;
