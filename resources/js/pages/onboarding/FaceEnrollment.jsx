import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../api';

const FaceEnrollment = () => {
    const webcamRef = useRef(null);
    const navigate = useNavigate();
    
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [step, setStep] = useState(0); // 0: Front, 1: Left, 2: Right
    const [embeddings, setEmbeddings] = useState([]);
    const [detecting, setDetecting] = useState(false);
    const [message, setMessage] = useState('Memuat AI pendeteksi wajah...');
    const [saving, setSaving] = useState(false);
    const [deviceId, setDeviceId] = useState('web_browser');

    const steps = [
        { title: 'Menghadap Depan', instruction: 'Posisikan wajah Anda tepat di tengah.' },
        { title: 'Menoleh Kiri', instruction: 'Tolehkan wajah Anda sedikit ke kiri.' },
        { title: 'Menoleh Kanan', instruction: 'Tolehkan wajah Anda sedikit ke kanan.' },
    ];

    useEffect(() => {
        const loadModels = async () => {
            try {
                // Ensure models exist in public/models
                // In a real app, you must copy the weights to public/models/
                // For this demo, we assume they are served from there.
                const MODEL_URL = '/models'; 
                
                // Only load tiny face detector to be faster in browser
                await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
                await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
                await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
                
                setModelsLoaded(true);
                setMessage(steps[0].instruction);

                // Try to get FP ID for device_id
                const fp = await import('@fingerprintjs/fingerprintjs').then(fpPromise => fpPromise.load());
                const result = await fp.get();
                setDeviceId(result.visitorId);

            } catch (err) {
                console.error("Failed to load models", err);
                setMessage("Gagal memuat model AI. Pastikan folder /models ada.");
            }
        };
        loadModels();
    }, []);

    const [referenceImage, setReferenceImage] = useState(null);

    const captureAndDetect = async () => {
        if (!webcamRef.current || !modelsLoaded || detecting) return;

        setDetecting(true);
        setMessage('Menganalisis wajah...');

        try {
            const video = webcamRef.current.video;
            if (video.readyState !== 4) {
                setDetecting(false);
                return;
            }

            // Detect face
            const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (detection) {
                // We found a face!
                const score = detection.detection.score;
                if (score > 0.8) {
                    // Good quality face
                    const newEmbeddings = [...embeddings, Array.from(detection.descriptor)];
                    setEmbeddings(newEmbeddings);
                    
                    if (step === 0) {
                        // Capture image on first step (front)
                        const imageSrc = webcamRef.current.getScreenshot();
                        setReferenceImage(imageSrc);
                    }
                    
                    if (step < 2) {
                        setStep(step + 1);
                        setMessage(`Bagus! Tingkat kecocokan/kejelasan: ${(score * 100).toFixed(0)}%. Selanjutnya: ${steps[step + 1].instruction}`);
                    } else {
                        // Finished
                        saveBiometrics(newEmbeddings, referenceImage || webcamRef.current.getScreenshot());
                    }
                } else {
                    setMessage(`Wajah terdeteksi (Skor: ${(score * 100).toFixed(0)}%), tetapi kurang jelas. Cari pencahayaan lebih baik.`);
                }
            } else {
                setMessage('Tidak ada wajah terdeteksi. Posisikan ke tengah kamera.');
            }
        } catch (error) {
            console.error(error);
            setMessage('Terjadi kesalahan saat pemindaian.');
        } finally {
            setTimeout(() => setDetecting(false), 1000); // 1 sec cooldown
        }
    };

    const saveBiometrics = async (finalEmbeddings, imageBase64) => {
        setSaving(true);
        setMessage('Menyimpan data biometrik dan foto...');
        try {
            await api.post('/biometrics/web/enroll', {
                embeddings: finalEmbeddings,
                device_id: deviceId,
                image: imageBase64
            });
            
            // Go to next step
            navigate('/onboarding'); // Let orchestrator handle next step
        } catch (err) {
            console.error(err);
            setMessage('Gagal menyimpan biometrik. Silakan coba lagi.');
            setSaving(false);
            setStep(0);
            setEmbeddings([]);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden max-w-md w-full relative">
                
                <div className="p-6 text-center bg-slate-800 text-white">
                    <h2 className="text-xl font-bold mb-1">Pendaftaran Wajah</h2>
                    <p className="text-slate-300 text-sm">Tahap {step + 1} dari 3: {steps[step]?.title}</p>
                </div>

                <div className="relative bg-black aspect-video flex items-center justify-center">
                    {!modelsLoaded ? (
                        <div className="flex flex-col items-center text-white">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <span className="text-sm">Menyiapkan Kamera...</span>
                        </div>
                    ) : (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                className="w-full h-full object-cover"
                                mirrored={true}
                            />
                            {/* Overlay frame */}
                            <div className="absolute inset-0 border-4 border-emerald-500/30 m-8 rounded-full pointer-events-none"></div>
                        </>
                    )}
                </div>

                <div className="p-6 text-center">
                    <p className={`text-sm mb-6 ${detecting ? 'text-amber-600' : 'text-slate-600'}`}>
                        {message}
                    </p>

                    <div className="flex justify-center gap-2 mb-6">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i < step ? 'bg-emerald-500' : i === step ? 'bg-amber-400' : 'bg-slate-200'}`}></div>
                        ))}
                    </div>

                    <button
                        onClick={captureAndDetect}
                        disabled={!modelsLoaded || detecting || saving || step > 2}
                        className="w-full bg-emerald-600 text-white font-medium py-3 px-4 rounded-lg hover:bg-emerald-700 transition flex justify-center items-center disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Camera className="h-5 w-5 mr-2" />}
                        {saving ? 'Menyimpan...' : 'Ambil Gambar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FaceEnrollment;
