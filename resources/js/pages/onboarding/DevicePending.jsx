import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ArrowLeft } from 'lucide-react';
import api from '../../api';
import { getDeviceFingerprint } from '../../deviceIdentity';

const DevicePending = () => {
    const navigate = useNavigate();

    useEffect(() => {
        let intervalId;
        const checkStatus = async () => {
            try {
                const fingerprint = await getDeviceFingerprint();
                const response = await api.get('/device/status', {
                    params: { device_fingerprint: fingerprint }
                });

                if (response.data.device && response.data.device.status === 'active') {
                    // Disetujui
                    clearInterval(intervalId);
                    const userStr = localStorage.getItem('user');
                    const userObj = userStr ? JSON.parse(userStr) : null;
                    if (userObj && userObj.is_super_admin) {
                        navigate('/admin/dashboard');
                    } else {
                        navigate('/employee/dashboard');
                    }
                } else if (!response.data.device || response.data.device.status !== 'pending_approval') {
                    // Ditolak / Dihapus
                    clearInterval(intervalId);
                    navigate('/onboarding/device');
                }
            } catch (err) {
                if (err.response?.status === 404) {
                    clearInterval(intervalId);
                    navigate('/onboarding/device');
                }
            }
        };

        checkStatus(); // Cek langsung saat komponen dimuat
        intervalId = setInterval(checkStatus, 5000); // Polling setiap 5 detik

        return () => clearInterval(intervalId);
    }, [navigate]);

    const handleLogout = async () => {
        try {
            await api.post('/logout');
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            navigate('/login');
        } catch (error) {
            console.error("Logout failed", error);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 max-w-md w-full p-8 text-center">
                <div className="bg-amber-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Clock className="h-8 w-8 text-amber-500" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 mb-2">Menunggu Persetujuan</h2>
                <p className="text-slate-600 mb-8 text-sm leading-relaxed">
                    Perangkat browser ini sedang dalam antrean persetujuan. Silakan hubungi Administrator HRD Anda untuk melakukan *Approve* agar perangkat ini dapat digunakan.
                </p>

                <button
                    onClick={handleLogout}
                    className="w-full bg-slate-100 text-slate-700 font-medium py-2.5 px-4 rounded-lg hover:bg-slate-200 transition flex justify-center items-center"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" /> Kembali ke Login
                </button>
            </div>
        </div>
    );
};

export default DevicePending;
