import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import {
    CalendarCheck,
    Loader2,
    MapPin,
    LogIn,
    LogOut,
    Camera,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    X
} from 'lucide-react';
import api from '../../api';

const Attendance = () => {
    const [searchParams] = useSearchParams();
    const action = searchParams.get('action'); // 'check-in' or 'check-out'
    const assignmentId = searchParams.get('assignment_id');
    const templateId = searchParams.get('template_id');
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [history, setHistory] = useState([]);

    // Calendar state
    const today = new Date();
    const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
    const [currentYear, setCurrentYear] = useState(today.getFullYear());
    const [workingDays, setWorkingDays] = useState([1, 2, 3, 4, 5]); // default Mon-Fri (1-5)

    // Modal state
    const [selectedLog, setSelectedLog] = useState(null);
    const [modalDate, setModalDate] = useState(null);

    // Scanner states
    const webcamRef = useRef(null);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [enrolledEmbeddings, setEnrolledEmbeddings] = useState(null);
    const [scanning, setScanning] = useState(false);
    const [scanMessage, setScanMessage] = useState('Memuat data...');
    const [scanError, setScanError] = useState('');
    const [requiresWebEnrollment, setRequiresWebEnrollment] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!action) {
            fetchWorkingDays();
            fetchHistory();
        } else {
            setupScanner();
        }
    }, [action, currentMonth, currentYear]);

    const fetchWorkingDays = async () => {
        try {
            const res = await api.get('/company/working-days');
            if (res.data.working_days) {
                setWorkingDays(res.data.working_days);
            }
        } catch (e) {
            console.error('Failed to fetch working days');
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/attendance/history?month=${currentMonth}&year=${currentYear}`);
            setHistory(response.data.data || []);
        } catch (error) {
            console.error("Error fetching attendance history:", error);
        } finally {
            setLoading(false);
        }
    };

    const setupScanner = async () => {
        try {
            setScanMessage('Memuat AI Model...');
            const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
            await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
            await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
            await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

            setScanMessage('Mengambil data wajah terdaftar...');
            const res = await api.get('/biometrics/web/sync');
            setEnrolledEmbeddings(res.data.embeddings);

            setModelsLoaded(true);
            setScanMessage('Silakan menghadap kamera...');
        } catch (err) {
            console.error(err);
            const missingEnrollment = err.response?.status === 404;
            setRequiresWebEnrollment(missingEnrollment);
            setScanError(missingEnrollment
                ? (err.response?.data?.message || 'Wajah untuk browser belum didaftarkan.')
                : 'Gagal memuat pemindai wajah. Periksa koneksi lalu coba kembali.');
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
                        setScanMessage('Wajah Cocok! Mengambil foto dan lokasi GPS...');
                        setScanning(false);

                        // Take snapshot
                        const imageSrc = webcamRef.current.getScreenshot();

                        handleAttendanceSubmit(1 - bestMatch, imageSrc, Array.from(detection.descriptor));
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

    const handleAttendanceSubmit = async (matchScore, imageBase64, faceDescriptor) => {
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
                    const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`, {
                        headers: {
                            'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7',
                        }
                    });
                    const geoData = await geoRes.json();
                    address = geoData.display_name;
                } catch (geoErr) {
                    console.error("Geocoding failed", geoErr);
                }

                const endpoint = action === 'check-in' ? '/attendance/check-in' : '/attendance/check-out';

                // Try to get FP ID for device_id
                const fp = await import('@fingerprintjs/fingerprintjs').then(fpPromise => fpPromise.load());
                const fpResult = await fp.get();

                // Convert base64 to Blob reliably
                const byteString = atob(imageBase64.split(',')[1]);
                const mimeString = imageBase64.split(',')[0].split(':')[1].split(';')[0];
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });

                // Use FormData for file upload
                const formData = new FormData();
                formData.append('latitude', lat);
                formData.append('longitude', lon);
                formData.append('address', address);
                formData.append('face_match_score', matchScore);
                faceDescriptor.forEach((value) => formData.append('face_descriptor[]', value));
                formData.append('device_id', fpResult.visitorId);
                formData.append('photo', blob, 'attendance.jpg');

                if (assignmentId) formData.append('shift_assignment_id', assignmentId);
                if (templateId) formData.append('shift_template_id', templateId);

                await api.post(endpoint, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
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

    // --- CALENDAR RENDER HELPERS ---
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay(); // 0 is Sun, 1 is Mon
    const startingDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Make Monday = 0

    const prevMonth = () => {
        if (currentMonth === 1) {
            setCurrentMonth(12);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 12) {
            setCurrentMonth(1);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const getLogForDay = (day) => {
        return history.find(log => {
            const date = new Date(log.check_in_at);
            return date.getDate() === day && date.getMonth() + 1 === currentMonth && date.getFullYear() === currentYear;
        });
    };

    const getDayStatusColor = (day) => {
        const log = getLogForDay(day);
        const loopDate = new Date(currentYear, currentMonth - 1, day);
        const dayOfWeek = loopDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
        const isWorkingDay = workingDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek); // if workingDays uses 1=Mon, 7=Sun

        if (log) {
            if (log.status === 'present' || log.status === 'on_time') return 'bg-emerald-100 text-emerald-700 border-emerald-300';
            if (log.status === 'late') return 'bg-amber-100 text-amber-700 border-amber-300';
            if (log.status === 'flagged') return 'bg-orange-100 text-orange-700 border-orange-300';
            return 'bg-blue-100 text-blue-700 border-blue-300';
        }

        // No log
        // Check if date is in the past
        today.setHours(0, 0, 0, 0);
        if (loopDate < today) {
            if (isWorkingDay) {
                return 'bg-rose-100 text-rose-700 border-rose-300'; // Missed working day (Alpha)
            }
            return 'bg-slate-100 text-slate-400 border-slate-200'; // Past weekend/holiday
        }

        return 'bg-white text-slate-600 border-slate-100'; // Future or today (not yet checked in)
    };

    const openModal = (day) => {
        const log = getLogForDay(day);
        const loopDate = new Date(currentYear, currentMonth - 1, day);
        setModalDate(loopDate);
        setSelectedLog(log || 'none');
    };

    const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const dayNames = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

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
                                    onClick={() => navigate(requiresWebEnrollment ? '/onboarding/face-enrollment' : '/employee/dashboard')}
                                    className="mt-4 px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700"
                                >
                                    {requiresWebEnrollment ? 'Daftarkan Wajah Web' : 'Kembali ke Dashboard'}
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
                                <style>{`
                                    @keyframes scanning-laser {
                                        0% { top: 0%; opacity: 0; }
                                        10% { opacity: 1; }
                                        90% { opacity: 1; }
                                        100% { top: 98%; opacity: 0; }
                                    }
                                    .animate-scan-laser {
                                        animation: scanning-laser 2.5s infinite linear;
                                    }
                                `}</style>
                                <div className={`absolute inset-0 border-4 pointer-events-none transition-colors duration-500 z-10 ${submitting ? 'border-emerald-500' : scanning ? 'border-blue-400' : 'border-emerald-500/30'}`}>
                                    {scanning && !submitting && (
                                        <div className="absolute left-0 right-0 h-[2px] bg-blue-400 shadow-[0_0_12px_rgba(96,165,250,1)] animate-scan-laser" />
                                    )}
                                </div>

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

    return (
        <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Riwayat Absensi (Kalender)</h1>
                    <p className="text-slate-500 mt-1">Pantau kehadiran harian dan detail lokasi/foto absen Anda.</p>
                </div>

                {/* Legend */}
                <div className="flex space-x-3 text-xs font-medium text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
                    <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-400 mr-1.5"></span> Hadir</div>
                    <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-amber-400 mr-1.5"></span> Telat</div>
                    <div className="flex items-center"><span className="w-3 h-3 rounded-full bg-rose-400 mr-1.5"></span> Alpha</div>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                    <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-600">
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center space-x-2">
                        <CalendarCheck className="h-5 w-5 text-slate-400" />
                        <span className="font-bold text-lg text-slate-700">{monthNames[currentMonth - 1]} {currentYear}</span>
                    </div>
                    <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-slate-200 transition text-slate-600">
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                    </div>
                ) : (
                    <div className="p-6">
                        <div className="grid grid-cols-7 gap-2 mb-2">
                            {dayNames.map(day => (
                                <div key={day} className="text-center text-sm font-bold text-slate-400 uppercase">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-2">
                            {/* Empty cells before start of month */}
                            {Array.from({ length: startingDay }).map((_, i) => (
                                <div key={`empty-${i}`} className="h-20 rounded-xl bg-slate-50 border border-slate-100 opacity-50"></div>
                            ))}

                            {/* Calendar Days */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const statusClass = getDayStatusColor(day);
                                return (
                                    <button
                                        key={day}
                                        onClick={() => openModal(day)}
                                        className={`h-20 rounded-xl border flex flex-col p-2 hover:opacity-80 transition-opacity relative ${statusClass}`}
                                    >
                                        <span className="text-sm font-bold opacity-75">{day}</span>
                                        {getLogForDay(day) && (
                                            <div className="mt-auto text-xs font-semibold">
                                                {new Date(getLogForDay(day).check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* MODAL */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 text-lg">
                                Detail Absensi - {modalDate?.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </h3>
                            <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
                            {selectedLog === 'none' ? (
                                <div className="text-center py-8 text-slate-500">
                                    <AlertCircle className="h-12 w-12 mx-auto text-slate-300 mb-3" />
                                    <p>Tidak ada rekaman absen pada tanggal ini.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Check IN */}
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center text-emerald-600 font-bold">
                                                <LogIn className="h-5 w-5 mr-2" /> Check In
                                            </div>
                                            {selectedLog.status && (
                                                <span className={`px-3 py-1 rounded-full text-xs font-bold ${selectedLog.status === 'on_time' ? 'bg-emerald-100 text-emerald-700' :
                                                        selectedLog.status === 'present' ? 'bg-amber-100 text-amber-700' :
                                                            selectedLog.status === 'late' ? 'bg-rose-100 text-rose-700' :
                                                                selectedLog.status === 'flagged' ? 'bg-orange-100 text-orange-700' :
                                                                    'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {selectedLog.status === 'on_time' ? 'Tepat Waktu' :
                                                        selectedLog.status === 'present' ? 'Hadir (Batas Toleransi)' :
                                                            selectedLog.status === 'late' ? 'Terlambat' :
                                                                selectedLog.status === 'flagged' ? 'Dipertanyakan' :
                                                                    selectedLog.status}
                                                </span>
                                            )}
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm space-y-2">
                                            <div className="flex">
                                                <span className="w-24 text-slate-500">Waktu:</span>
                                                <span className="font-bold text-slate-800">{new Date(selectedLog.check_in_at).toLocaleTimeString('id-ID')}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="w-24 text-slate-500">Alamat:</span>
                                                <span className="font-medium text-slate-700">{selectedLog.check_in_address || 'Tidak ditemukan'}</span>
                                            </div>
                                            {selectedLog.check_in_photo_url && (
                                                <div className="mt-3">
                                                    <span className="block text-slate-500 mb-2">Foto Bukti:</span>
                                                    <img src={selectedLog.check_in_photo_url} alt="Check in" className="w-full max-w-[200px] h-auto rounded-lg border border-slate-200 shadow-sm" />
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Check OUT */}
                                    {selectedLog.check_out_at && (
                                        <div className="space-y-3">
                                            <div className="flex items-center text-rose-600 font-bold">
                                                <LogOut className="h-5 w-5 mr-2" /> Check Out
                                            </div>
                                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-sm space-y-2">
                                                <div className="flex">
                                                    <span className="w-24 text-slate-500">Waktu:</span>
                                                    <span className="font-bold text-slate-800">{new Date(selectedLog.check_out_at).toLocaleTimeString('id-ID')}</span>
                                                </div>
                                                <div className="flex">
                                                    <span className="w-24 text-slate-500">Alamat:</span>
                                                    <span className="font-medium text-slate-700">{selectedLog.check_out_address || 'Tidak ditemukan'}</span>
                                                </div>
                                                {selectedLog.check_out_photo_url && (
                                                    <div className="mt-3">
                                                        <span className="block text-slate-500 mb-2">Foto Bukti:</span>
                                                        <img src={selectedLog.check_out_photo_url} alt="Check out" className="w-full max-w-[200px] h-auto rounded-lg border border-slate-200 shadow-sm" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Attendance;
