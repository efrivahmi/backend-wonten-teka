import React, { useState, useEffect } from 'react';
import { CalendarRange, Loader2, Save, Users, Clock } from 'lucide-react';
import api from '../../api';

const ShiftAssignmentForm = () => {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    const [employees, setEmployees] = useState([]);
    const [templates, setTemplates] = useState([]);
    
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedShifts, setSelectedShifts] = useState([]);
    
    // Past assignments cache to quickly show what is already assigned
    const [weeklyAssignments, setWeeklyAssignments] = useState([]);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedEmployee && selectedDate) {
            // Determine selected shifts from weeklyAssignments
            const assignmentsForDate = weeklyAssignments.filter(a => 
                a.employee_id.toString() === selectedEmployee.toString() && 
                a.date === selectedDate
            );
            setSelectedShifts(assignmentsForDate.map(a => a.shift_template_id));
        } else {
            setSelectedShifts([]);
        }
    }, [selectedEmployee, selectedDate, weeklyAssignments]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/shift-assignments');
            setEmployees(response.data.employees || []);
            setTemplates(response.data.templates || []);
            setWeeklyAssignments(response.data.assignments || []);
        } catch (error) {
            console.error("Error fetching assignments data:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleShift = (templateId) => {
        if (selectedShifts.includes(templateId)) {
            setSelectedShifts(selectedShifts.filter(id => id !== templateId));
        } else {
            setSelectedShifts([...selectedShifts, templateId]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedEmployee || !selectedDate) {
            alert("Pilih Karyawan dan Tanggal terlebih dahulu.");
            return;
        }

        try {
            setSaving(true);
            await api.post('/admin/shift-assignments', {
                employee_id: selectedEmployee,
                date: selectedDate,
                shift_template_ids: selectedShifts,
            });
            alert("Penugasan shift berhasil disimpan!");
            // Refresh assignments
            const response = await api.get('/admin/shift-assignments');
            setWeeklyAssignments(response.data.assignments || []);
        } catch (error) {
            console.error(error);
            alert("Gagal menyimpan penugasan shift.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null; // Or a small spinner

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                    <h2 className="text-lg font-bold text-slate-800">Penugasan Shift Ganda / Khusus</h2>
                    <p className="text-sm text-slate-500">
                        Atur shift ganda (seperti piket atau lembur) untuk karyawan pada tanggal tertentu. 
                        Jika tidak diatur, karyawan akan menggunakan Shift Default.
                    </p>
                </div>
            </div>
            
            <div className="p-6">
                <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Karyawan
                            </label>
                            <select 
                                value={selectedEmployee}
                                onChange={(e) => setSelectedEmployee(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                required
                            >
                                <option value="">-- Pilih Karyawan --</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>{emp.user?.name || emp.full_name} (NIK: {emp.employee_number})</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Tanggal
                            </label>
                            <input 
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                                required
                            />
                        </div>
                    </div>
                    
                    {selectedEmployee && selectedDate && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-3">
                                Pilih Shift yang Ditugaskan
                            </label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templates.map(template => {
                                    const isSelected = selectedShifts.includes(template.id);
                                    return (
                                        <div 
                                            key={template.id}
                                            onClick={() => toggleShift(template.id)}
                                            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                                isSelected 
                                                ? 'border-emerald-500 bg-emerald-50' 
                                                : 'border-slate-200 bg-white hover:border-slate-300'
                                            }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={`font-bold ${isSelected ? 'text-emerald-800' : 'text-slate-800'}`}>
                                                    {template.name}
                                                </h4>
                                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${
                                                    isSelected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white'
                                                }`}>
                                                    {isSelected && <Save className="w-3 h-3" />}
                                                </div>
                                            </div>
                                            
                                            <div className="flex gap-2 mb-2">
                                                <span className={`inline-block px-2 py-0.5 text-xs font-bold rounded-full ${
                                                    template.category === 'Piket' ? 'bg-orange-100 text-orange-700' : 
                                                    template.category === 'Lembur' ? 'bg-purple-100 text-purple-700' : 
                                                    'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {template.category || 'Reguler'}
                                                </span>
                                            </div>

                                            <div className="flex items-center text-sm text-slate-600">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {template.start_time.substring(0, 5)} - {template.end_time.substring(0, 5)}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            
                            {templates.length === 0 && (
                                <p className="text-slate-500 italic text-sm">Belum ada template shift yang dibuat.</p>
                            )}
                        </div>
                    )}
                    
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button 
                            type="submit"
                            disabled={saving || !selectedEmployee || !selectedDate}
                            className="px-6 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                        >
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Simpan Penugasan Shift
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ShiftAssignmentForm;
