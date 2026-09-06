import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Search, 
    Plus, 
    MoreVertical, 
    Loader2,
    X,
    Edit2,
    Trash2
} from 'lucide-react';
import api from '../../api';

const Employees = () => {
    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState([]);
    const [search, setSearch] = useState('');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        employee_number: '',
        department: '',
        position: '',
        phone: '',
        role: 'employee'
    });
    const [saving, setSaving] = useState(false);
    const [activeDropdown, setActiveDropdown] = useState(null);

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/employees');
            setEmployees(response.data.data || response.data || []);
        } catch (error) {
            console.error("Error fetching employees:", error);
        } finally {
            setLoading(false);
        }
    };

    // --- CRUD Handlers ---
    const openAddModal = () => {
        setEditingEmployee(null);
        setFormData({
            name: '',
            email: '',
            password: '',
            employee_number: '',
            department: '',
            position: '',
            phone: '',
            role: 'employee'
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const openEditModal = (emp) => {
        setEditingEmployee(emp);
        setFormData({
            name: emp.full_name || emp.user?.name || '',
            email: emp.email || emp.user?.email || '',
            password: '', // Leave blank unless they want to change it
            employee_number: emp.employee_number || '',
            department: emp.department || '',
            position: emp.position || '',
            phone: emp.phone || '',
            role: emp.user?.roles?.[0]?.name || 'employee'
        });
        setIsModalOpen(true);
        setActiveDropdown(null);
    };

    const handleFormChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const saveEmployee = async (e) => {
        e.preventDefault();
        try {
            setSaving(true);
            if (editingEmployee) {
                // Remove password from payload if it's empty during edit
                const payload = { ...formData };
                if (!payload.password) {
                    delete payload.password;
                }
                await api.put(`/admin/employees/${editingEmployee.id}`, payload);
            } else {
                await api.post('/admin/employees', formData);
            }
            setIsModalOpen(false);
            fetchEmployees();
        } catch (error) {
            console.error("Failed to save employee", error);
            alert(error.response?.data?.message || "Gagal menyimpan data karyawan.");
        } finally {
            setSaving(false);
        }
    };

    const deleteEmployee = async (id) => {
        if (!window.confirm("Apakah Anda yakin ingin menonaktifkan dan menghapus karyawan ini?")) return;
        try {
            await api.delete(`/admin/employees/${id}`);
            fetchEmployees();
            setActiveDropdown(null);
        } catch (error) {
            console.error("Failed to delete employee", error);
            alert("Gagal menghapus karyawan.");
        }
    };

    const filteredEmployees = employees.filter(emp => 
        emp.user?.name?.toLowerCase().includes(search.toLowerCase()) || 
        emp.user?.email?.toLowerCase().includes(search.toLowerCase()) ||
        emp.position?.toLowerCase().includes(search.toLowerCase()) ||
        emp.employee_number?.toLowerCase().includes(search.toLowerCase())
    );

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
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Manajemen Karyawan</h1>
                    <p className="text-slate-500 mt-1">Kelola data karyawan, jabatan, dan detail kontak.</p>
                </div>
                <div className="flex space-x-2">
                    <button 
                        onClick={openAddModal}
                        className="flex items-center space-x-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        <span>Tambah Karyawan</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="relative max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-colors"
                            placeholder="Cari nama, email, NIK, atau posisi..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-white text-slate-500 text-sm font-semibold uppercase tracking-wider border-b border-slate-200">
                                <th className="px-6 py-4">Nama Lengkap</th>
                                <th className="px-6 py-4">Posisi</th>
                                <th className="px-6 py-4">Email</th>
                                <th className="px-6 py-4">Tanggal Bergabung</th>
                                <th className="px-6 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 relative">
                            {filteredEmployees.length > 0 ? (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-10 w-10 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center font-bold">
                                                    {emp.user?.name?.charAt(0) || emp.full_name?.charAt(0) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{emp.user?.name || emp.full_name}</p>
                                                    <p className="text-xs text-slate-500">NIK: {emp.employee_number}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-medium text-slate-800 bg-slate-100 px-3 py-1 rounded-full">
                                                {emp.position || 'Staff'}
                                            </span>
                                            {emp.department && (
                                                <p className="text-xs text-slate-500 mt-1">{emp.department}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600">{emp.user?.email || emp.email}</p>
                                            <p className="text-xs text-slate-400">{emp.phone}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-slate-600">
                                                {new Date(emp.join_date || emp.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="relative inline-block text-left">
                                                <button 
                                                    onClick={() => setActiveDropdown(activeDropdown === emp.id ? null : emp.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical className="h-5 w-5" />
                                                </button>
                                                {activeDropdown === emp.id && (
                                                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-100 py-1 z-50">
                                                        <button 
                                                            onClick={() => openEditModal(emp)}
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center"
                                                        >
                                                            <Edit2 className="h-4 w-4 mr-2 text-blue-500" /> Edit Data
                                                        </button>
                                                        <button 
                                                            onClick={() => deleteEmployee(emp.id)}
                                                            className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center text-rose-600"
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-2" /> Hapus Karyawan
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center justify-center">
                                            <Users className="h-12 w-12 text-slate-300 mb-3" />
                                            <p className="text-lg font-medium text-slate-800">Tidak ada karyawan</p>
                                            <p className="text-sm">Tidak ada karyawan yang cocok dengan pencarian Anda.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* MODAL FORM KARYAWAN */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl border border-slate-100 overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                            <h3 className="font-bold text-slate-800 text-lg">
                                {editingEmployee ? 'Edit Karyawan' : 'Tambah Karyawan Baru'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="overflow-y-auto p-6">
                            <form id="employeeForm" onSubmit={saveEmployee} className="space-y-5">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nama Lengkap <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="text" 
                                            name="name"
                                            value={formData.name}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Induk Karyawan (NIK) <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="text" 
                                            name="employee_number"
                                            value={formData.employee_number}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Email <span className="text-rose-500">*</span></label>
                                        <input 
                                            type="email" 
                                            name="email"
                                            value={formData.email}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Nomor Telepon</label>
                                        <input 
                                            type="tel" 
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Departemen</label>
                                        <input 
                                            type="text" 
                                            name="department"
                                            value={formData.department}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Posisi / Jabatan</label>
                                        <input 
                                            type="text" 
                                            name="position"
                                            value={formData.position}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Password Akun {editingEmployee ? '(Isi jika ingin mengubah)' : <span className="text-rose-500">*</span>}
                                        </label>
                                        <input 
                                            type="password" 
                                            name="password"
                                            value={formData.password}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                            required={!editingEmployee}
                                            minLength="6"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Role Akun</label>
                                        <select 
                                            name="role"
                                            value={formData.role}
                                            onChange={handleFormChange}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        >
                                            <option value="employee">Employee (Karyawan)</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                </div>
                            </form>
                        </div>

                        <div className="p-5 border-t border-slate-100 flex justify-end space-x-3 shrink-0 bg-slate-50">
                            <button 
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg font-medium transition-colors"
                            >
                                Batal
                            </button>
                            <button 
                                type="submit"
                                form="employeeForm"
                                disabled={saving}
                                className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center shadow-sm"
                            >
                                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                                Simpan Karyawan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Employees;
