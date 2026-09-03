import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../api';

const steps = [
    { title: 'Menghadap Depan', instruction: 'Posisikan wajah Anda tepat di tengah.' },
    { title: 'Menoleh Kiri', instruction: 'Tolehkan wajah Anda sedikit ke kiri.' },
    { title: 'Menoleh Kanan', instruction: 'Tolehkan wajah Anda sedikit ke kanan.' },
];

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

    useEffect(() => {
        const loadModels = async () => {
            try {
                // We use jsdelivr CDN to load the pre-trained weights so we don't need to manually host them
                const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights'; 
                
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

    useEffect(() => {
        let isMounted = true;
        let timeoutId = null;

        const processDetection = async () => {
            if (!webcamRef.current || !modelsLoaded || saving || step > 2) {
                if (isMounted && step <= 2 && !saving) timeoutId = setTimeout(processDetection, 1000);
                return;
            }

            try {
                const video = webcamRef.current.video;
                if (video.readyState !== 4) {
                    if (isMounted) timeoutId = setTimeout(processDetection, 1000);
                    return;
                }

                setDetecting(true);
                
                const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    const score = detection.detection.score;
                    if (score > 0.8) {
                        const newEmbeddings = [...embeddings, Array.from(detection.descriptor)];
                        
                        let currentRefImage = referenceImage;
                        if (step === 0) {
                            currentRefImage = webcamRef.current.getScreenshot();
                            setReferenceImage(currentRefImage);
                        }
                        
                        if (step < 2) {
                            setEmbeddings(newEmbeddings);
                            setStep(step + 1);
                            setMessage(`Bagus! Tingkat kecocokan/kejelasan: ${(score * 100).toFixed(0)}%. Selanjutnya: ${steps[step + 1].instruction}`);
                            setDetecting(false);
                            return; // Re-run effect with new step
                        } else {
                            // Finished
                            setEmbeddings(newEmbeddings);
                            setStep(step + 1);
                            setDetecting(false);
                            saveBiometrics(newEmbeddings, currentRefImage || webcamRef.current.getScreenshot());
                            return;
                        }
                    } else {
                        setMessage(`Wajah terdeteksi (Skor: ${(score * 100).toFixed(0)}%), tetapi kurang jelas. Posisikan lebih baik.`);
                    }
                } else {
                    setMessage('Tidak ada wajah terdeteksi. Posisikan ke tengah kamera.');
                }
            } catch (error) {
                console.error(error);
                setMessage('Terjadi kesalahan saat pemindaian.');
            }

            setDetecting(false);
            if (isMounted) {
                timeoutId = setTimeout(processDetection, 1500);
            }
        };

        if (modelsLoaded && !saving && step <= 2) {
             processDetection();
        }

        return () => {
            isMounted = false;
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, [modelsLoaded, saving, step, embeddings, referenceImage, deviceId, steps]);

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

                    <div className="w-full bg-slate-100 text-slate-700 font-medium py-3 px-4 rounded-lg flex justify-center items-center">
                        {(saving || detecting) ? <Loader2 className="animate-spin h-5 w-5 mr-2 text-emerald-600" /> : <Camera className="h-5 w-5 mr-2 text-slate-500" />}
                        {saving ? 'Menyimpan Data...' : (modelsLoaded && step <= 2) ? 'Memindai Otomatis...' : 'Selesai'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FaceEnrollment;
