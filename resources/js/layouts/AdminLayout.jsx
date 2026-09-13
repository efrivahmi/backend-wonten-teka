import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
    LayoutDashboard, 
    CheckSquare, 
    Users, 
    CalendarRange,
    FileBarChart,
    LogOut,
    Menu,
    X,
    Shield,
    Bell,
    MapPin,
    CalendarCheck,
    ChevronDown,
    CalendarDays,
    Banknote,
    ListChecks,
    Smartphone,
    Flag,
    Briefcase
} from 'lucide-react';
import api from '../api';
import { getDeviceFingerprint } from '../deviceIdentity';

const AdminLayout = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [openMenus, setOpenMenus] = useState({'Pengaturan Absensi': true});
    const location = useLocation();
    const navigate = useNavigate();
    
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    // Bounce-out mechanism if device is revoked/rejected while logged in
    useEffect(() => {
        // Skip for super admin
        if (user && user.is_super_admin) return;

        let intervalId;
        const checkDeviceValidity = async () => {
            try {
                const fingerprint = await getDeviceFingerprint();
                const response = await api.get('/device/status', {
                    params: { device_fingerprint: fingerprint }
                });

                if (!response.data.device || response.data.device.status !== 'active') {
                    // Device revoked or not active anymore
                    clearInterval(intervalId);
                    navigate('/onboarding/device');
                }
            } catch (err) {
                if (err.response?.status === 404) {
                    // Device completely deleted from DB
                    clearInterval(intervalId);
                    navigate('/onboarding/device');
                }
            }
        };

        checkDeviceValidity(); // Initial check
        intervalId = setInterval(checkDeviceValidity, 15000); // Check every 15s

        return () => clearInterval(intervalId);
    }, [navigate, user]);

    const toggleMenu = (name) => {
        setOpenMenus(prev => ({...prev, [name]: !prev[name]}));
    };

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Persetujuan', href: '/admin/approvals', icon: CheckSquare },
        { name: 'Karyawan', href: '/admin/employees', icon: Users },
        { 
            name: 'Pengaturan Absensi', 
            icon: CalendarCheck, 
            children: [
                { name: 'Jadwal & Shift', href: '/admin/schedule', icon: CalendarRange },
                { name: 'Lokasi Absensi', href: '/admin/settings', icon: MapPin },
            ]
        },
        { name: 'Laporan', href: '/admin/reports', icon: FileBarChart },
        {
            name: 'Operasional',
            icon: ListChecks,
            children: [
                { name: 'Perangkat', href: '/admin/devices', icon: Smartphone },
                { name: 'Event', href: '/admin/events', icon: CalendarDays },
                { name: 'Payroll', href: '/admin/payroll', icon: Banknote },
                { name: 'Jenis Cuti', href: '/admin/leave-types', icon: Briefcase },
                { name: 'Flag Absensi', href: '/admin/attendance-flags', icon: Flag },
                { name: 'Biometrik Wajah', href: '/admin/biometrics', icon: Shield },
            ]
        },
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
        <div className="teka-shell flex h-screen">
            {/* Sidebar */}
            <div className={`teka-sidebar fixed inset-y-0 left-0 z-50 w-64 shadow-xl transform ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 transition-transform duration-300 ease-in-out`}>
                <div className="flex items-center justify-between h-20 px-5 border-b border-slate-100">
                    <img src="/images/lemdiklat-logo.png" alt="Lemdiklat Taruna Nusantara Indonesia" className="h-11 w-auto max-w-[190px] object-contain object-left" />
                    <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-slate-500 hover:text-green-700">
                        <X className="h-6 w-6" />
                    </button>
                </div>
                
                <div className="p-4">
                    <div className="bg-lime-50 rounded-2xl p-4 flex items-center space-x-3 border border-lime-100">
                        <div className="bg-green-100 text-green-700 p-2 rounded-lg">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{user.name || 'Super Admin'}</p>
                            <p className="text-xs text-slate-500 truncate">{user.email || 'Administrator'}</p>
                        </div>
                    </div>
                </div>

                <nav className="px-4 py-4 space-y-1 overflow-y-auto" style={{ height: 'calc(100vh - 180px)' }}>
                    {navigation.map((item) => {
                        if (item.children) {
                            const isChildActive = item.children.some(child => location.pathname.startsWith(child.href));
                            const isOpen = openMenus[item.name];
                            return (
                                <div key={item.name} className="space-y-1">
                                    <button
                                        onClick={() => toggleMenu(item.name)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-colors ${
                                            isChildActive && !isOpen
                                            ? 'bg-green-50 text-green-800'
                                            : 'text-slate-600 hover:bg-lime-50 hover:text-green-800'
                                        }`}
                                    >
                                        <div className="flex items-center space-x-3">
                                            <item.icon className={`h-5 w-5 flex-shrink-0 ${isChildActive ? 'text-green-700' : ''}`} />
                                            <span className={`font-medium text-sm truncate ${isChildActive ? 'text-green-800' : ''}`}>{item.name}</span>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isOpen && (
                                        <div className="pl-11 pr-2 py-1 space-y-1">
                                            {item.children.map(child => {
                                                const isActive = location.pathname.startsWith(child.href);
                                                return (
                                                    <Link
                                                        key={child.name}
                                                        to={child.href}
                                                        onClick={() => setIsMobileMenuOpen(false)}
                                                        className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                                                            isActive 
                                                            ? 'bg-lime-50 text-green-700'
                                                            : 'text-slate-500 hover:text-green-700'
                                                        }`}
                                                    >
                                                        <child.icon className="h-4 w-4 flex-shrink-0" />
                                                        <span className="font-medium text-sm truncate">{child.name}</span>
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        const isActive = location.pathname.startsWith(item.href);
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setIsMobileMenuOpen(false)}
                                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                    isActive 
                                    ? 'bg-green-700 text-white shadow-md'
                                    : 'text-slate-600 hover:bg-lime-50 hover:text-green-800'
                                }`}
                            >
                                <item.icon className="h-5 w-5 flex-shrink-0" />
                                <span className="font-medium text-sm truncate">{item.name}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="absolute bottom-0 w-full p-4 border-t border-slate-100 bg-white">
                    <button 
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-3 w-full rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                    >
                        <LogOut className="h-5 w-5 flex-shrink-0" />
                        <span className="font-medium text-sm">Keluar</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden bg-slate-50 relative z-0">
                <header className="teka-topbar border-b h-16 flex items-center px-4 md:px-8 justify-between z-10 flex-shrink-0">
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

export default AdminLayout;
