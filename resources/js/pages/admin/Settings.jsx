import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, MapPin, Save, Loader2 } from 'lucide-react';
import api from '../../api';

const Settings = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
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
            const response = await api.get('/company/geofence');
            if (response.data && response.data.latitude) {
                setGeofence(response.data);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setLoading(false);
        }
    };

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
        <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Pengaturan Sistem</h1>
                <p className="text-slate-500 mt-1">Konfigurasi lokasi kantor dan batas area absensi (Geofence).</p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-5 border-b border-slate-100 flex items-center space-x-2 bg-slate-50">
                    <MapPin className="h-5 w-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-800">Lokasi Absensi Kantor</h2>
                </div>
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Latitude</label>
                            <input 
                                type="number" 
                                step="any"
                                value={geofence.latitude}
                                onChange={(e) => setGeofence({...geofence, latitude: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Longitude</label>
                            <input 
                                type="number" 
                                step="any"
                                value={geofence.longitude}
                                onChange={(e) => setGeofence({...geofence, longitude: e.target.value})}
                                required
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Radius Absensi (Meter)</label>
                        <input 
                            type="number" 
                            value={geofence.geofence_radius_meters}
                            onChange={(e) => setGeofence({...geofence, geofence_radius_meters: e.target.value})}
                            required
                            min="10"
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Jarak maksimal karyawan dari titik kordinat di atas untuk bisa melakukan absensi.</p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                        <button 
                            type="submit" 
                            disabled={saving}
                            className="flex items-center justify-center px-6 py-2.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : (
                                <>
                                    <Save className="h-5 w-5 mr-2" />
                                    Simpan Pengaturan
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Settings;
