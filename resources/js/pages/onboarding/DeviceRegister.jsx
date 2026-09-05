import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Laptop, Loader2, AlertCircle } from 'lucide-react';
import fpPromise from '@fingerprintjs/fingerprintjs';
import api from '../../api';

const DeviceRegister = () => {
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState(null);
    const [fingerprint, setFingerprint] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const checkDevice = async () => {
            try {
                // Initialize fingerprintjs
                const fp = await fpPromise.load();
                const result = await fp.get();
                const fpId = result.visitorId;
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
            deviceName: finalDeviceName.substring(0, 50),
            osVersion: os.substring(0, 50)
        };
    };

    const handleRegister = async () => {
        setRegistering(true);
        setError(null);
        try {
            const deviceInfo = getDeviceInfo();
            await api.post('/device/register', {
                device_fingerprint: fingerprint,
                device_name: deviceInfo.deviceName,
                os_version: deviceInfo.osVersion,
                app_version: 'web-1.0'
            });

            // If success, it's either active or pending depending on backend logic
            navigate('/onboarding/device-pending');
        } catch (err) {
            // Because we changed the logic in DeviceAdminController, the DeviceController
            // might still block it if bound to another user.
            // But actually, the backend DeviceController@register throws 403 if bound to ANOTHER user.
            // Let's handle that by showing the error, and maybe a "Request Transfer" button if we implement it on backend.
            // Since we haven't updated DeviceController@register yet, it will throw 403.
            // I should update DeviceController.php next.
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
                    Untuk keamanan ekstra, sistem kami menerapkan kebijakan akses perangkat. Anda perlu mendaftarkan perangkat anda agar dapat digunakan untuk absensi dan aktivitas lainnya.
                </p>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start text-left border border-red-100">
                        <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 shrink-0" />
                        <p className="text-sm text-red-700">{error}</p>
                    </div>
                )}

                <button
                    onClick={handleRegister}
                    disabled={registering}
                    className="w-full bg-emerald-600 text-white font-medium py-2.5 px-4 rounded-lg hover:bg-emerald-700 transition flex justify-center items-center"
                >
                    {registering ? <Loader2 className="animate-spin h-5 w-5" /> : 'Daftarkan Device Ini'}
                </button>
            </div>
        </div>
    );
};

export default DeviceRegister;
