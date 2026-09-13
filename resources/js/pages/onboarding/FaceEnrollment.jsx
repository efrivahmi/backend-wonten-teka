import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle2 } from 'lucide-react';
import api from '../../api';
import { getDeviceFingerprint } from '../../deviceIdentity';
import { saveLocalFaceEmbeddings } from '../../biometricStorage';

const steps = [
    { title: 'Menghadap Depan', instruction: 'Posisikan wajah Anda tepat di tengah.' },
    { title: 'Menoleh Kiri', instruction: 'Tolehkan wajah Anda sedikit ke kiri.' },
    { title: 'Menoleh Kanan', instruction: 'Tolehkan wajah Anda sedikit ke kanan.' },
];

const getYawRatio = (landmarks) => {
    const jaw = landmarks.getJawOutline();
    const nose = landmarks.getNose();
    const faceWidth = Math.max(1, jaw[16].x - jaw[0].x);
    const faceCenter = (jaw[0].x + jaw[16].x) / 2;
    return (nose[3].x - faceCenter) / faceWidth;
};

const matchesPose = (step, yaw, firstSideYaw) => {
    if (step === 0) return Math.abs(yaw) < 0.035;
    if (step === 1) return Math.abs(yaw) > 0.045;
    return Math.abs(yaw) > 0.045
        && firstSideYaw !== null
        && Math.sign(yaw) !== Math.sign(firstSideYaw);
};

const mobileLandmarkVector = (detection) => {
    const box = detection.detection.box;
    const average = (points) => ({
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    });
    const leftEye = average(detection.landmarks.getLeftEye());
    const rightEye = average(detection.landmarks.getRightEye());
    const nose = average(detection.landmarks.getNose().slice(-3));
    const mouth = detection.landmarks.getMouth();
    const leftMouth = mouth.reduce((left, point) => point.x < left.x ? point : left);
    const rightMouth = mouth.reduce((right, point) => point.x > right.x ? point : right);
    return [leftEye, rightEye, nose, leftMouth, rightMouth].flatMap((point) => [
        (point.x - box.x) / box.width,
        (point.y - box.y) / box.height,
    ]);
};

const FaceEnrollment = ({ returnTo = '/onboarding' }) => {
    const webcamRef = useRef(null);
    const firstSideYawRef = useRef(null);
    const navigate = useNavigate();
    
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [step, setStep] = useState(0); // 0: Front, 1: Left, 2: Right
    const [embeddings, setEmbeddings] = useState([]);
    const [mobileEmbeddings, setMobileEmbeddings] = useState([]);
    const [detecting, setDetecting] = useState(false);
    const [message, setMessage] = useState('Memuat AI pendeteksi wajah...');
    const [saving, setSaving] = useState(false);
    const [deviceId, setDeviceId] = useState('web_browser');
    const [qualityProgress, setQualityProgress] = useState(0);
    const [quality, setQuality] = useState({ face: false, light: false, position: false });

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

                setDeviceId(await getDeviceFingerprint());

            } catch (err) {
                console.error("Failed to load models", err);
                setMessage("Gagal memuat model AI. Pastikan folder /models ada.");
            }
        };
        loadModels();
    }, []);

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
                const canvas = document.createElement('canvas'); canvas.width = 32; canvas.height = 32;
                const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(video, 0, 0, 32, 32);
                const pixels = ctx.getImageData(0, 0, 32, 32).data; let luma = 0;
                for (let i = 0; i < pixels.length; i += 16) luma += .2126 * pixels[i] + .7152 * pixels[i + 1] + .0722 * pixels[i + 2];
                const lightOkay = luma / (pixels.length / 16) >= 55;
                
                const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    const score = detection.detection.score;
                    const yaw = getYawRatio(detection.landmarks);
                    const box = detection.detection.box;
                    const faceRatio = (box.width * box.height) / (video.videoWidth * video.videoHeight);
                    const positionOkay = faceRatio >= .08 && faceRatio <= .65;
                    const poseOkay = matchesPose(step, yaw, firstSideYawRef.current);
                    setQuality({ face: true, light: lightOkay, position: positionOkay && poseOkay });
                    setQualityProgress(Math.round(25 + (lightOkay ? 25 : 0) + (positionOkay ? 20 : 0) + (poseOkay ? 30 : 0)));
                    if (!lightOkay) {
                        setMessage('Terlalu gelap. Pindah ke tempat yang lebih terang.');
                    } else if (!positionOkay) {
                        setMessage(faceRatio < .08 ? 'Wajah terlalu jauh. Dekatkan kamera.' : 'Wajah terlalu dekat. Mundur sedikit.');
                    } else if (score > 0.8 && poseOkay) {
                        const newEmbeddings = [...embeddings, Array.from(detection.descriptor)];
                        const newMobileEmbeddings = [...mobileEmbeddings, mobileLandmarkVector(detection)];

                        if (step === 1) firstSideYawRef.current = yaw;
                        
                        if (step < 2) {
                            setEmbeddings(newEmbeddings);
                            setMobileEmbeddings(newMobileEmbeddings);
                            setStep(step + 1);
                            setMessage(`Bagus! Tingkat kecocokan/kejelasan: ${(score * 100).toFixed(0)}%. Selanjutnya: ${steps[step + 1].instruction}`);
                            setDetecting(false);
                            return; // Re-run effect with new step
                        } else {
                            // Finished
                            setEmbeddings(newEmbeddings);
                            setMobileEmbeddings(newMobileEmbeddings);
                            setStep(step + 1);
                            setDetecting(false);
                            saveBiometrics(newEmbeddings, newMobileEmbeddings);
                            return;
                        }
                    } else {
                        setMessage(score <= 0.8
                            ? 'Wajah kurang jelas. Tambah pencahayaan dan dekatkan kamera.'
                            : steps[step].instruction);
                    }
                } else {
                    setQuality({ face: false, light: lightOkay, position: false }); setQualityProgress(lightOkay ? 25 : 0);
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
    }, [modelsLoaded, saving, step, embeddings, mobileEmbeddings, deviceId]);

    const saveBiometrics = async (finalEmbeddings, finalMobileEmbeddings) => {
        setSaving(true);
        setMessage('Menyimpan deskriptor wajah terenkripsi...');
        try {
            await api.post('/biometrics/web/enroll', {
                embeddings: finalEmbeddings,
                mobile_embeddings: finalMobileEmbeddings,
                device_id: deviceId
            });
            await saveLocalFaceEmbeddings(finalEmbeddings);
            
            // Go to next step
            navigate(returnTo);
        } catch (err) {
            console.error(err);
            setMessage('Gagal menyimpan biometrik. Silakan coba lagi.');
            setSaving(false);
            setStep(0);
            setEmbeddings([]);
            setMobileEmbeddings([]);
        }
    };

    return (
        <div className="min-h-screen bg-black flex items-center justify-center p-4 md:p-8">
            <div className="bg-stone-100 rounded-[2rem] shadow-2xl overflow-hidden max-w-lg w-full relative border border-stone-700">
                
                <div className="p-7 bg-black text-white">
                    <p className="teka-kicker text-stone-400 mb-5">Identitas biometrik</p>
                    <h2 className="teka-display text-4xl">{returnTo.startsWith('/employee') ? 'Perbarui' : 'Daftarkan'} <span className="teka-accent">wajah.</span></h2>
                    <p className="text-stone-400 text-sm mt-4">Tahap {Math.min(step + 1, 3)} dari 3 · {steps[step]?.title || 'Selesai'}</p>
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
                            <style>{`@keyframes enroll-scan{0%{top:10%;opacity:.2}50%{opacity:1}100%{top:88%;opacity:.2}} .enroll-scan{animation:enroll-scan 1.8s ease-in-out infinite alternate}`}</style>
                            <div className="pointer-events-none absolute inset-[12%] rounded-[42%] border-2 border-dashed border-white/80 shadow-[0_0_0_999px_rgba(0,0,0,.2)]"><div className="enroll-scan absolute left-0 right-0 h-0.5 bg-emerald-300 shadow-[0_0_14px_#6ee7b7]"/></div>
                        </>
                    )}
                </div>

                <div className="p-6 text-center">
                    <p className={`text-sm mb-6 ${detecting ? 'text-amber-600' : 'text-slate-600'}`}>
                        {message}
                    </p>

                    <div className="mb-4"><div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>Kualitas tahap ini</span><span>{qualityProgress}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-200"><div className={`h-full transition-all duration-500 ${quality.light ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{width:`${qualityProgress}%`}}/></div></div>
                    <div className="mb-5 flex justify-center gap-2">{[['Wajah',quality.face],['Cahaya',quality.light],['Posisi',quality.position]].map(([label,valid])=><span key={label} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${valid?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{valid?'✓':'○'} {label}</span>)}</div>

                    <div className="flex justify-center gap-2 mb-6">
                        {[0, 1, 2].map((i) => (
                            <div key={i} className={`w-3 h-3 rounded-full ${i < step ? 'bg-emerald-500' : i === step ? 'bg-amber-400' : 'bg-slate-200'}`}></div>
                        ))}
                    </div>

                    <div className="w-full bg-slate-100 text-slate-700 font-medium py-3 px-4 rounded-lg flex justify-center items-center">
                        {(saving || detecting) ? <Loader2 className="animate-spin h-5 w-5 mr-2 text-emerald-600" /> : <Camera className="h-5 w-5 mr-2 text-slate-500" />}
                        {saving ? 'Menyimpan Data...' : (modelsLoaded && step <= 2) ? 'Memindai Otomatis...' : 'Selesai'}
                    </div>
                    <p className="text-xs text-slate-500 mt-4">Descriptor wajah disimpan terenkripsi di perangkat ini dan menggantikan data lokal lama setelah perekaman berhasil.</p>
                </div>
            </div>
        </div>
    );
};

export default FaceEnrollment;
