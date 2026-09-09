import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, MapPin, Save, Loader2 } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import api from '../../api';

// Perbaikan untuk ikon marker default leaflet yang kadang tidak muncul di Vite/Webpack
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
const DefaultIcon = L.icon({
    iconUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Komponen helper untuk menangkap event klik pada peta
const LocationPicker = ({ geofence, setGeofence }) => {
    useMapEvents({
        click(e) {
            setGeofence({
                ...geofence,
                latitude: e.latlng.lat,
                longitude: e.latlng.lng
            });
        },
    });

    return geofence.latitude && geofence.longitude ? (
        <>
            <Marker position={[geofence.latitude, geofence.longitude]} />
            <Circle 
                center={[geofence.latitude, geofence.longitude]} 
                radius={parseFloat(geofence.geofence_radius_meters) || 50} 
                pathOptions={{ color: '#059669', fillColor: '#059669', fillOpacity: 0.2 }}
            />
        </>
    ) : null;
};

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savingApp, setSavingApp] = useState(false);
    const [appConfig, setAppConfig] = useState({ branding: {}, employee_menu: [], dropdowns: {} });
    const [geofence, setGeofence] = useState({
        latitude: -6.1754,
        longitude: 106.8272,
        geofence_radius_meters: 50
    });

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const [response, configResponse] = await Promise.all([
                api.get('/company/geofence'),
                api.get('/app-config'),
            ]);
            setAppConfig(configResponse.data.data);
            if (response.data && response.data.latitude) {
                setGeofence({
                    latitude: parseFloat(response.data.latitude),
                    longitude: parseFloat(response.data.longitude),
                    geofence_radius_meters: parseFloat(response.data.geofence_radius_meters || 50)
                });
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

    const saveAppConfig = async () => {
        try {
            setSavingApp(true);
            await api.put('/admin/app-config', appConfig);
            alert('Konfigurasi tampilan dan menu berhasil disimpan.');
        } catch (error) {
            alert(error.response?.data?.message || 'Gagal menyimpan konfigurasi aplikasi.');
        } finally {
            setSavingApp(false);
        }
    };

    const setDropdown = (key, value) => setAppConfig(prev => ({
        ...prev,
        dropdowns: { ...prev.dropdowns, [key]: value.split(',').map(item => item.trim()).filter(Boolean) },
    }));

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            await api.put('/company/geofence', geofence);
            alert('Pengaturan lokasi absensi berhasil disimpan!');
        } catch (error) {
            alert('Gagal menyimpan pengaturan.');
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Pengaturan Lokasi Absensi</h1>
                <p className="text-slate-500 mt-1">Konfigurasi lokasi kantor dan batas area absensi (Geofence).</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col md:flex-row">
                {/* Bagian Peta */}
                <div className="w-full md:w-3/5 h-64 md:h-auto min-h-[400px] relative z-0">
                    <MapContainer 
                        center={[geofence.latitude || -6.1754, geofence.longitude || 106.8272]} 
                        zoom={16} 
                        style={{ height: '100%', width: '100%', minHeight: '400px' }}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        <LocationPicker geofence={geofence} setGeofence={setGeofence} />
                    </MapContainer>
                    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-[1000] bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-md text-sm font-medium text-slate-700 pointer-events-none">
                        📍 Klik pada peta untuk memindahkan lokasi
                    </div>
                </div>

                {/* Bagian Form */}
                <div className="w-full md:w-2/5 p-6 border-t md:border-t-0 md:border-l border-slate-200 bg-slate-50">
                    <div className="flex items-center space-x-2 mb-6">
                        <MapPin className="h-5 w-5 text-emerald-600" />
                        <h2 className="text-lg font-bold text-slate-800">Koordinat Kantor</h2>
                    </div>
                    
                    <form onSubmit={handleSave} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Latitude</label>
                            <input 
                                type="number" 
                                step="any"
                                value={geofence.latitude}
                                onChange={(e) => setGeofence({...geofence, latitude: e.target.value})}
                                required
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Longitude</label>
                            <input 
                                type="number" 
                                step="any"
                                value={geofence.longitude}
                                onChange={(e) => setGeofence({...geofence, longitude: e.target.value})}
                                required
                                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">Radius Absensi (Meter)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={geofence.geofence_radius_meters}
                                    onChange={(e) => setGeofence({...geofence, geofence_radius_meters: e.target.value})}
                                    required
                                    min="10"
                                    className="w-full px-4 py-2 bg-white border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                />
                                <span className="absolute right-4 top-2 text-slate-400 font-medium text-sm">m</span>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                                Jarak radius lingkaran hijau pada peta adalah toleransi karyawan untuk bisa melakukan absensi.
                            </p>
                        </div>

                        <div className="pt-4 border-t border-slate-200">
                            <button 
                                type="submit" 
                                disabled={saving}
                                className="flex items-center justify-center w-full px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 shadow-md shadow-emerald-500/20"
                            >
                                {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                    <>
                                        <Save className="h-5 w-5 mr-2" />
                                        Simpan Peta & Pengaturan
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            <section className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Tampilan dan akses aplikasi</h2>
                    <p className="text-sm text-slate-500">Perubahan ini dipakai oleh website dan aplikasi mobile tanpa mengubah source code.</p>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                    <label className="text-sm font-semibold text-slate-700">Nama portal
                        <input value={appConfig.branding?.portal_name || ''} onChange={e => setAppConfig(prev => ({...prev, branding: {...prev.branding, portal_name: e.target.value}}))} className="mt-2 w-full px-4 py-3 border border-slate-200 rounded-xl" />
                    </label>
                    <label className="text-sm font-semibold text-slate-700">URL gambar hero
                        <input value={appConfig.branding?.hero_image_url || ''} onChange={e => setAppConfig(prev => ({...prev, branding: {...prev.branding, hero_image_url: e.target.value}}))} className="mt-2 w-full px-4 py-3 border border-slate-200 rounded-xl" placeholder="https://..." />
                    </label>
                </div>
                <div className="grid md:grid-cols-3 gap-4">
                    {['departments', 'positions', 'banks'].map(key => <label key={key} className="text-sm font-semibold text-slate-700 capitalize">{key}
                        <textarea value={(appConfig.dropdowns?.[key] || []).join(', ')} onChange={e => setDropdown(key, e.target.value)} rows="4" className="mt-2 w-full px-4 py-3 border border-slate-200 rounded-xl" />
                    </label>)}
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                    {(appConfig.employee_menu || []).map((item, index) => <label key={item.key} className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
                        <span className="min-w-24"><small className="text-slate-500">{item.key}</small></span>
                        <input aria-label={`Nama menu ${item.key}`} value={item.label} onChange={e => setAppConfig(prev => ({...prev, employee_menu: prev.employee_menu.map((menu, i) => i === index ? {...menu, label: e.target.value} : menu)}))} className="flex-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-semibold" />
                        <input type="checkbox" checked={item.enabled} onChange={e => setAppConfig(prev => ({...prev, employee_menu: prev.employee_menu.map((menu, i) => i === index ? {...menu, enabled: e.target.checked} : menu)}))} className="h-5 w-5 accent-green-700" />
                    </label>)}
                </div>
                <button type="button" onClick={saveAppConfig} disabled={savingApp} className="px-6 py-3 bg-green-700 text-white font-bold rounded-xl disabled:opacity-50">{savingApp ? 'Menyimpan…' : 'Simpan konfigurasi aplikasi'}</button>
            </section>
        </div>
    );
};

export default Settings;
