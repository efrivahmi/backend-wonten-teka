import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { 
    CalendarCheck, 
    Filter, 
    Loader2, 
    MapPin,
    LogIn,
    LogOut,
    Camera,
    AlertCircle
} from 'lucide-react';
import api from '../../api';

const Attendance = () => {
    const [searchParams] = useSearchParams();
    const action = searchParams.get('action'); // 'check-in' or 'check-out'
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    // Scanner states
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [enrolledEmbeddings, setEnrolledEmbeddings] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState('Memuat data...');
    const [scanError, setScanError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!action) {
            fetchHistory();
        } else {
            setupScanner();
        }
    }, [action]);

    const setupScanner = async () => {
        try {
            setScanMessage('Memuat AI Model...');
            const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'; 
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
            
            setScanMessage('Mengambil data wajah terdaftar...');
            const res = await api.get('/biometrics/sync');
            setEnrolledEmbeddings(res.data.embeddings);
            
            setModelsLoaded(true);
            setScanMessage('Silakan menghadap kamera...');
        } catch (err) {
            console.error(err);
            setScanError('Gagal memuat AI atau data wajah. Pastikan Anda sudah mendaftarkan wajah (Enrollment).');
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get('/attendance/history');
            setHistory(response.data.data || []);
        } catch (error) {
            console.error("Error fetching attendance history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!action || !modelsLoaded || !enrolledEmbeddings || submitting) return;
        
        let isMounted = true;
        let timeoutId = null;

        const processDetection = async () => {
            if (!webcamRef.current || submitting) return;
            const video = webcamRef.current.video;
            if (video.readyState !== 4) {
                if (isMounted) timeoutId = setTimeout(processDetection, 500);
                return;
            }

            try {
                setScanning(true);
                const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    let bestMatch = 1.0;
                    for (let i = 0; i < enrolledEmbeddings.length; i++) {
                        const distance = faceapi.euclideanDistance(detection.descriptor, new Float32Array(enrolledEmbeddings[i]));
                        if (distance < bestMatch) {
                            bestMatch = distance;
                        }
                    }

                    if (bestMatch < 0.45) { // Threshold for matching
                        setScanMessage('Wajah Cocok! Memeriksa lokasi GPS...');
                        setScanning(false);
                        handleAttendanceSubmit(1 - bestMatch);
                        return; // Stop the scanning loop
                    } else {
                        setScanMessage(`Wajah tidak dikenali (Jarak: ${bestMatch.toFixed(2)}). Pastikan pencahayaan baik.`);
                    }
                } else {
                    setScanMessage('Tidak ada wajah terdeteksi. Posisikan ke tengah kamera.');
                }
            } catch (err) {
                console.error(err);
            }
            
            setScanning(false);
            if (isMounted) {
                timeoutId = setTimeout(processDetection, 1000);
            }
        };

        processDetection();
        
        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [action, modelsLoaded, enrolledEmbeddings, submitting]);

    const handleAttendanceSubmit = async (matchScore) => {
        setSubmitting(true);
        
        if (!navigator.geolocation) {
            setScanError("Browser Anda tidak mendukung deteksi lokasi (GPS).");
            setSubmitting(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                
                // Get Address using Nominatim OpenStreetMap
                let address = '';
                try {
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
                    const geoData = await geoRes.json();
                    address = geoData.display_name;
                } catch (geoErr) {
                    console.error("Geocoding failed", geoErr);
                }

                const endpoint = action === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';
                
                // Try to get FP ID for device_id
                const fp = await import('@fingerprintjs/fingerprintjs').then(fpPromise => fpPromise.load());
                const fpResult = await fp.get();

                await api.post(endpoint, {
                    latitude: lat,
                    longitude: lon,
                    address: address,
                    face_match_score: matchScore,
                    device_id: fpResult.visitorId
                });
                
                alert(`Berhasil ${action === 'check-in' ? 'Check-In' : 'Check-Out'}!`);
                window.location.href = '/employee/dashboard'; // redirect
                
            } catch (e) {
                setScanError(`Gagal ${action}: ` + (e.response?.data?.message || 'Error Server'));
                setSubmitting(false);
            }
        }, (error) => {
            setSubmitting(false);
            setScanError("Gagal mendapatkan lokasi GPS. Pastikan izin lokasi (Location) diizinkan di browser Anda.");
        }, { enableHighAccuracy: true });
    };

    if (action) {
        return (
            <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
                <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                    <div className="p-6 text-center border-b border-slate-100 bg-slate-800 text-white">
                        <h1 className="text-2xl font-bold tracking-tight capitalize">Absensi - {action.replace('-', ' ')}</h1>
                        <p className="text-slate-300 mt-1">Sistem Otomatis Pemindai Wajah & Lokasi</p>
                    </div>

                    <div className="p-6 bg-slate-50 flex flex-col items-center justify-center relative min-h-[350px]">
                        {scanError ? (
                            <div className="flex flex-col items-center text-rose-600 bg-rose-50 p-6 rounded-xl border border-rose-200 text-center">
                                <AlertCircle className="h-10 w-10 mb-3" />
                                <h3 className="font-bold mb-1">Gagal</h3>
                                <p className="text-sm">{scanError}</p>
                                <button 
                                    onClick={() => navigate('/employee/dashboard')}
                                    className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
                                >
                                    Kembali ke Dashboard
                                </button>
                            </div>
                        ) : !modelsLoaded ? (
                            <div className="flex flex-col items-center text-slate-500">
                                <Loader2 className="h-8 w-8 animate-spin mb-3 text-emerald-600" />
                                <span className="font-medium text-sm">{scanMessage}</span>
                            </div>
                        ) : (
                            <div className="w-full max-w-sm relative rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800">
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/jpeg"
                                    className="w-full object-cover aspect-square"
                                    mirrored={true}
                                />
                                {/* Overlay frame */}
                                <div className={`absolute inset-0 border-4 pointer-events-none transition-colors duration-500 ${submitting ? 'border-emerald-500' : scanning ? 'border-amber-400' : 'border-emerald-500/30'}`}></div>
                                
                                {submitting && (
                                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                        <Loader2 className="h-8 w-8 animate-spin mb-2" />
                                        <span className="font-medium">Memproses Kehadiran...</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {!scanError && (
                        <div className="p-6 bg-white border-t border-slate-100 text-center">
                            <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-slate-100 text-slate-700 font-medium text-sm">
                                {submitting ? (
                                    <Loader2 className="animate-spin h-4 w-4 mr-2 text-emerald-600" />
                                ) : (
                                    <Camera className="h-4 w-4 mr-2 text-slate-500" />
                                )}
                                {scanMessage}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Riwayat Absensi</h1>
                    <p className="text-slate-500 mt-1">Pantau kehadiran harian dan riwayat lokasi absen Anda.</p>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <CalendarCheck className="h-5 w-5 text-slate-400" />
                        <span className="font-medium text-slate-700">Catatan Absensi (30 Hari Terakhir)</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Tanggal</th>
                                <th className="px-6 py-4">Check In</th>
                                <th className="px-6 py-4">Check Out</th>
                                <th className="px-6 py-4 max-w-[200px]">Alamat & Lokasi</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {history.length > 0 ? (
                                history.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-slate-800 font-medium">
                                                <CalendarCheck className="h-4 w-4 mr-2 text-slate-400" />
                                                <span>{log.check_in_at ? new Date(log.check_in_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center px-3 py-1.5 w-fit rounded-lg font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-200`}>
                                                <LogIn className="h-3.5 w-3.5 mr-1.5" />
                                                {log.check_in_at ? new Date(log.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className={`flex items-center px-3 py-1.5 w-fit rounded-lg font-bold text-xs ${log.check_out_at ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-50 text-slate-500 border border-slate-200'}`}>
                                                <LogOut className="h-3.5 w-3.5 mr-1.5" />
                                                {log.check_out_at ? new Date(log.check_out_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Belum'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-[200px]">
                                            <div className="flex items-start text-sm text-slate-600">
                                                <MapPin className="h-4 w-4 mr-1.5 text-slate-400 flex-shrink-0 mt-0.5" />
                                                <div>
                                                    <span className="capitalize font-medium block truncate" title={log.check_in_address || 'Tdk ada alamat'}>
                                                        {log.check_in_address ? log.check_in_address.split(',')[0] + ', ...' : (log.check_in_photo_url ? 'Face Recognition' : 'App')}
                                                    </span>
                                                    {log.notes && <span className="text-xs text-slate-500">{log.notes}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                                                log.status === 'present' || log.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' : 
                                                log.status === 'late' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {log.status === 'present' ? 'Hadir' : log.status === 'late' ? 'Terlambat' : log.status}
                                            </span>
                                            {log.is_flagged && (
                                                <span className="ml-2 inline-flex px-2 py-1 text-xs font-bold rounded-full bg-rose-100 text-rose-700">
                                                    Flagged
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <CalendarCheck className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Tidak ada riwayat absensi</p>
                                            <p className="text-sm mt-1">Anda belum pernah melakukan absensi bulan ini.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Attendance;
