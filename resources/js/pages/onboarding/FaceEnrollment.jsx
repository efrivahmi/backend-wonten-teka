import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import { Camera, Loader2, CheckCircle2, ScanFace, ShieldCheck } from 'lucide-react';
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
    const [samples, setSamples] = useState([]);
    const [detectedFace, setDetectedFace] = useState(null);

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
                    setDetectedFace({
                        left: ((video.videoWidth - box.x - box.width) / video.videoWidth) * 100,
                        top: (box.y / video.videoHeight) * 100,
                        width: (box.width / video.videoWidth) * 100,
                        height: (box.height / video.videoHeight) * 100,
                        score: Math.round(score * 100),
                    });
                    setQuality({ face: true, light: lightOkay, position: positionOkay && poseOkay });
                    setQualityProgress(Math.round(25 + (lightOkay ? 25 : 0) + (positionOkay ? 20 : 0) + (poseOkay ? 30 : 0)));
                    if (!lightOkay) {
                        setMessage('Terlalu gelap. Pindah ke tempat yang lebih terang.');
                    } else if (!positionOkay) {
                        setMessage(faceRatio < .08 ? 'Wajah terlalu jauh. Dekatkan kamera.' : 'Wajah terlalu dekat. Mundur sedikit.');
                    } else if (score > 0.8 && poseOkay) {
                        const screenshot = webcamRef.current?.getScreenshot();
                        if (screenshot) setSamples(current => [...current, screenshot]);
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
                    setDetectedFace(null);
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
            setSamples([]);
            setDetectedFace(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="mx-auto max-w-7xl">
                <header className="mb-7 flex items-center gap-4"><span className="rounded-2xl bg-emerald-100 p-3 text-emerald-700"><ScanFace/></span><div><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Identitas Biometrik</p><h1 className="text-3xl font-bold text-slate-900">{returnTo.startsWith('/employee') ? 'Perbarui' : 'Daftarkan'} Sample Wajah</h1><p className="mt-1 text-slate-500">Ambil tiga pose agar verifikasi wajah lebih stabil pada website dan mobile.</p></div></header>
                <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
                    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="text-xl font-bold text-slate-900">Ambil Sample Baru</h2><p className="text-sm text-slate-500">Tahap {Math.min(step + 1, 3)} dari 3 · {steps[step]?.title || 'Selesai'}</p></div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${detectedFace && quality.position && quality.light ? 'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700'}`}>{detectedFace && quality.position && quality.light ? <CheckCircle2 size={17}/>:<ScanFace size={17}/>} {detectedFace ? `Wajah ${detectedFace.score}%` : 'Mencari wajah'}</span></div>
                        <div className="relative aspect-video overflow-hidden bg-slate-950">
                            {!modelsLoaded ? <div className="absolute inset-0 flex flex-col items-center justify-center text-white"><Loader2 className="mb-3 h-9 w-9 animate-spin"/><span>Menyiapkan kamera dan pendeteksi wajah…</span></div> : <Webcam audio={false} ref={webcamRef} screenshotFormat="image/jpeg" screenshotQuality={0.92} className="h-full w-full object-cover" mirrored />}
                            <style>{`@keyframes enroll-scan{0%{top:8%;opacity:.25}50%{opacity:1}100%{top:90%;opacity:.25}} .enroll-scan{animation:enroll-scan 1.8s ease-in-out infinite alternate}`}</style>
                            {modelsLoaded && <><div className="pointer-events-none absolute inset-[10%] rounded-[35%] border border-dashed border-white/60 shadow-[0_0_0_999px_rgba(0,0,0,.18)]"><div className="enroll-scan absolute left-0 right-0 h-0.5 bg-emerald-300 shadow-[0_0_14px_#6ee7b7]"/></div>{detectedFace&&<div className={`pointer-events-none absolute border-2 ${quality.position&&quality.light?'border-emerald-400':'border-amber-400'}`} style={{left:`${detectedFace.left}%`,top:`${detectedFace.top}%`,width:`${detectedFace.width}%`,height:`${detectedFace.height}%`}}><span className={`absolute -top-7 left-0 whitespace-nowrap rounded px-2 py-1 text-xs font-bold text-white ${quality.position&&quality.light?'bg-emerald-500':'bg-amber-500'}`}>{detectedFace.score}% · wajah terdeteksi</span></div>}</>}
                            <div className={`absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold shadow-lg ${quality.face&&quality.light&&quality.position?'bg-emerald-500 text-white':'bg-white/90 text-slate-800'}`}>{saving||detecting?<Loader2 className="h-4 w-4 animate-spin"/>:<Camera className="h-4 w-4"/>}{saving?'Menyimpan data…':quality.face&&quality.light&&quality.position?'Siap, sample diambil otomatis':'Posisikan wajah sesuai petunjuk'}</div>
                        </div>
                        <div className="p-5"><p className={`text-center font-semibold ${quality.face&&quality.light&&quality.position?'text-emerald-700':'text-slate-700'}`}>{message}</p><div className="mx-auto mt-4 max-w-xl"><div className="mb-2 flex justify-between text-xs font-bold text-slate-500"><span>Kualitas sample</span><span>{qualityProgress}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-emerald-500 transition-all" style={{width:`${qualityProgress}%`}}/></div></div><div className="mt-4 flex flex-wrap justify-center gap-2">{[['Wajah',quality.face],['Cahaya',quality.light],['Pose',quality.position]].map(([label,valid])=><span key={label} className={`rounded-full px-3 py-1 text-xs font-semibold ${valid?'bg-emerald-100 text-emerald-700':'bg-slate-100 text-slate-500'}`}>{valid?'✓':'○'} {label}</span>)}</div></div>
                    </section>
                    <aside className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-3"><span className="h-8 w-1.5 rounded-full bg-violet-500"/><div><h2 className="text-xl font-bold text-slate-900">Daftar Sample</h2><p className="text-sm text-slate-500">{samples.length} dari 3 pose tersimpan</p></div></div><div className="mt-5 grid grid-cols-2 gap-3">{steps.map((item,index)=><div key={item.title} className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-2 ${samples[index]?'border-emerald-300':'border-dashed border-slate-200 bg-slate-50'}`}>{samples[index]?<img src={samples[index]} alt={`Sample ${item.title}`} className="h-full w-full object-cover"/>:<div className="flex h-full flex-col items-center justify-center p-3 text-center text-slate-400"><ScanFace className="mb-2"/><small>{item.title}</small></div>}<span className="absolute left-2 top-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold text-slate-700">#{index+1}</span>{index===0&&samples[index]&&<span className="absolute right-2 top-2 rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">UTAMA</span>}<span className="absolute inset-x-2 bottom-2 rounded-lg bg-black/60 px-2 py-1 text-center text-[10px] font-semibold text-white">{item.title}</span></div>)}</div><div className="mt-5 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800"><div className="flex gap-2"><ShieldCheck className="shrink-0" size={20}/><p>Sample foto hanya ditampilkan selama proses ini. Yang disimpan untuk pencocokan adalah descriptor wajah terenkripsi.</p></div></div></aside>
                </div>
            </div>
        </div>
    );
};

export default FaceEnrollment;
