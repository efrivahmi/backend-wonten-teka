import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Loader2 } from 'lucide-react';
import api from '../../api';

const CompleteProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState(null);

    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        phone: '',
        employee_number: '',
        nik: '',
        npwp: '',
        date_of_birth: '',
        gender: 'male',
        address: '',
        employment_status: 'tetap',
        ptkp_status: 'TK/0',
    });

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await api.get('/me');
                const user = response.data.user;
                
                setFormData(prev => ({
                    ...prev,
                    full_name: user.name || '',
                    email: user.email || '',
                    employee_number: user.employee?.employee_number || '',
                }));
            } catch (err) {
                console.error("Failed to fetch user", err);
            } finally {
                setFetching(false);
            }
        };
        fetchUserData();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await api.post('/employee/complete-profile', formData);
            // Profile complete, proceed to next orchestrator step
            navigate('/onboarding');
        } catch (err) {
            setError(err.response?.data?.message || 'Gagal menyimpan profil.');
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 py-12 px-4">
            <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-emerald-600 p-6 text-white flex items-center">
                    <UserCircle className="h-8 w-8 mr-3" />
                    <div>
                        <h2 className="text-xl font-bold">Lengkapi Profil Anda</h2>
                        <p className="text-emerald-100 text-sm">Data ini diperlukan untuk administrasi dan absensi.</p>
                    </div>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap *</label>
                                <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} required className="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 py-2 px-3 border" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
                                <input type="email" name="email" value={formData.email} onChange={handleChange} required readOnly className="w-full rounded-lg border-slate-200 bg-slate-50 shadow-sm py-2 px-3 border text-slate-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">No. HP</label>
                                <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 py-2 px-3 border" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">NIK (KTP) *</label>
                                <input type="text" name="nik" value={formData.nik} onChange={handleChange} required className="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 py-2 px-3 border" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">NPWP</label>
                                <input type="text" name="npwp" value={formData.npwp} onChange={handleChange} className="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 py-2 px-3 border" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Status PTKP *</label>
                                <select name="ptkp_status" value={formData.ptkp_status} onChange={handleChange} required className="w-full rounded-lg border-slate-300 shadow-sm focus:border-emerald-500 focus:ring focus:ring-emerald-200 py-2 px-3 border bg-white">
                                    <option value="TK/0">TK/0 (Tidak Kawin, 0 Tanggungan)</option>
                                    <option value="TK/1">TK/1 (Tidak Kawin, 1 Tanggungan)</option>
                                    <option value="K/0">K/0 (Kawin, 0 Tanggungan)</option>
                                    <option value="K/1">K/1 (Kawin, 1 Tanggungan)</option>
                                    <option value="K/2">K/2 (Kawin, 2 Tanggungan)</option>
                                    <option value="K/3">K/3 (Kawin, 3 Tanggungan)</option>
                                </select>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                            <button type="submit" disabled={loading} className="bg-emerald-600 text-white font-medium py-2.5 px-6 rounded-lg hover:bg-emerald-700 transition flex items-center">
                                {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                                {loading ? 'Menyimpan...' : 'Simpan Profil'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CompleteProfile;
