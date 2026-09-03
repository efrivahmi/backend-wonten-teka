import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    CalendarCheck, 
    Briefcase, 
    Clock, 
    FileText,
    LogOut,
    Menu,
    X,
    User,
    Bell
} from 'lucide-react';
import api from '../api';

const EmployeeLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const navigation = [
        { name: 'Dashboard', href: '/employee/dashboard', icon: LayoutDashboard },
        { name: 'Absensi', href: '/employee/attendance', icon: CalendarCheck },
        { name: 'Cuti', href: '/employee/leave', icon: Briefcase },
        { name: 'Lembur', href: '/employee/overtime', icon: Clock },
        { name: 'Klaim/Reimburse', href: '/employee/claims', icon: FileText },
        { name: 'Slip Gaji', href: '/employee/payslip', icon: FileText },
    ];

    const handleLogout = async () => {
        try {
            await api.post('/logout');
        } catch (e) {
            console.error('Logout error', e);
        } finally {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <div className="flex h-screen bg-slate-50">
            {/* Sidebar */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 shadow-sm transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
                <div className="flex items-center justify-between h-16 px-6 border-b border-slate-100">
                    <span className="text-xl font-bold text-emerald-800 tracking-tight">Wonten Teka</span>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="bg-slate-50 rounded-xl p-4 flex items-center space-x-3 border border-slate-100">
                        <div className="bg-emerald-100 text-emerald-600 p-2 rounded-lg">
                            <User className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user.name || 'Karyawan'}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email || 'user@wontenteka.com'}</p>
                        </div>
                    </div>
                </div>

                <nav className="px-4 py-4 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
                    {navigation.map((item) => {
                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    isActive 
                                    ? 'bg-emerald-50 text-emerald-700 font-medium' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-emerald-600'
                                }`}
                            >
                                <item.icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                                <span className="text-sm truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 bg-white">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                        <LogOut className="h-5 w-5 flex-shrink-0 text-slate-400" />
                        <span className="font-medium text-sm">Keluar</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden bg-slate-50 relative z-0">
                <header className="bg-white border-b border-slate-200 h-16 flex items-center px-4 md:px-8 justify-between z-10 flex-shrink-0">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden text-slate-500 hover:text-slate-800 p-2">
                        <Menu className="h-6 w-6" />
                    </button>
                    
                    <div className="flex items-center space-x-4 ml-auto">
                        <button className="text-slate-400 hover:text-emerald-600 transition-colors p-2">
                            <Bell className="h-5 w-5" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto w-full">
                    <Outlet />
                </main>
            </div>
            
            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default EmployeeLayout;
