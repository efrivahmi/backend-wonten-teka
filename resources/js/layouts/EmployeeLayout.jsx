import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    CalendarCheck, 
    FileText, 
    Briefcase,
    Clock,
    LogOut,
    Menu,
    X,
    User
} from 'lucide-react';
import api from '../api';

const EmployeeLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    
    // Parse user from local storage
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
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-green-800 to-green-900 text-white shadow-xl transition-all duration-300">
                <div className="flex items-center justify-center h-20 border-b border-green-700">
                    <h1 className="text-2xl font-extrabold tracking-tight">Wonten Teka</h1>
                </div>
                
                <div className="flex-1 overflow-y-auto py-4">
                    <div className="px-4 mb-6">
                        <div className="flex items-center space-x-3 bg-green-800/50 p-3 rounded-xl border border-green-700/50">
                            <div className="bg-green-100 p-2 rounded-full">
                                <User className="h-5 w-5 text-green-800" />
                            </div>
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-semibold truncate">{user.name || 'Karyawan'}</p>
                                <p className="text-xs text-green-300 truncate">{user.email || '-'}</p>
                            </div>
                        </div>
                    </div>
                    
                    <nav className="px-2 space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all ${
                                        isActive
                                            ? 'bg-white text-green-800 shadow-md'
                                            : 'text-green-100 hover:bg-green-700/50 hover:text-white'
                                    }`}
                                >
                                    <item.icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-green-600' : 'text-green-300 group-hover:text-white'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </nav>
                </div>
                
                <div className="p-4 border-t border-green-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-3 text-sm font-medium text-green-100 rounded-xl hover:bg-red-500/20 hover:text-red-100 transition-all"
                    >
                        <LogOut className="mr-3 h-5 w-5 text-red-300" />
                        Keluar
                    </button>
                </div>
            </aside>

            {/* Mobile Header & Menu */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <header className="md:hidden bg-gradient-to-r from-green-800 to-green-700 h-16 flex items-center justify-between px-4 shadow-md">
                    <h1 className="text-xl font-bold text-white">Wonten Teka</h1>
                    <button
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-white p-2 rounded-md hover:bg-green-600 focus:outline-none"
                    >
                        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                    </button>
                </header>

                {/* Mobile Navigation Drawer */}
                {isMobileMenuOpen && (
                    <div className="md:hidden fixed inset-0 z-40 bg-green-900 bg-opacity-95 pt-16 pb-4 flex flex-col">
                        <div className="px-4 py-2 border-b border-green-700/50 flex items-center space-x-3 text-white mb-4">
                            <div className="bg-green-100 p-2 rounded-full">
                                <User className="h-5 w-5 text-green-800" />
                            </div>
                            <div>
                                <p className="font-semibold">{user.name || 'Karyawan'}</p>
                                <p className="text-sm text-green-300">{user.email || '-'}</p>
                            </div>
                        </div>
                        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                    className="flex items-center px-4 py-4 text-base font-medium rounded-xl text-white hover:bg-green-700/50"
                                >
                                    <item.icon className="mr-4 h-6 w-6 text-green-300" />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                        <div className="p-4">
                            <button
                                onClick={handleLogout}
                                className="flex justify-center items-center w-full px-4 py-4 text-base font-medium text-white rounded-xl bg-red-500/20 hover:bg-red-500/40"
                            >
                                <LogOut className="mr-3 h-5 w-5" />
                                Keluar
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <main className="flex-1 overflow-y-auto bg-gray-50 relative z-0">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default EmployeeLayout;
