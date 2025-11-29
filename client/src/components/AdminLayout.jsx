import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import {
    Menu, X, Search, Bell, User, BarChart3, Users, FileText,
    Shield, Settings, LogOut, CheckSquare, Award, ClipboardList
} from 'lucide-react';

const AdminLayout = ({ children, title }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', icon: BarChart3, path: '/' },
        { name: 'Credits Rules', icon: Award, path: '/admin/credits' },
        { name: 'User Management', icon: Users, path: '/admin/users' },
        { name: 'Event Approvals', icon: CheckSquare, path: '/admin/approvals' },
        { name: 'Reports', icon: FileText, path: '/admin/reports' },
        { name: 'System Logs', icon: ClipboardList, path: '/audit-logs' },
        { name: 'Settings', icon: Settings, path: '/admin/settings' },
    ];

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-20">
                <div className="p-6 border-b border-gray-100 flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900 tracking-tight">Admin Portal</span>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <button
                                key={item.name}
                                onClick={() => navigate(item.path)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                                        ? 'bg-blue-50 text-blue-600 shadow-sm'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                            >
                                <item.icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                                {item.name}
                            </button>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-100">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {menuOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
                    onClick={() => setMenuOpen(false)}
                />
            )}

            {/* Sidebar - Mobile */}
            <aside className={`fixed inset-y-0 left-0 w-64 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-40 md:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'
                }`}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Shield className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900">Admin</span>
                    </div>
                    <button onClick={() => setMenuOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <nav className="p-4 space-y-1">
                    {menuItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => {
                                navigate(item.path);
                                setMenuOpen(false);
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${location.pathname === item.path
                                    ? 'bg-blue-50 text-blue-600'
                                    : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            <item.icon className="w-5 h-5" />
                            {item.name}
                        </button>
                    ))}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 mt-4"
                    >
                        <LogOut className="w-5 h-5" />
                        Sign Out
                    </button>
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 md:ml-64 flex flex-col min-h-screen transition-all duration-300">
                {/* Header */}
                <header className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-10 px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setMenuOpen(true)}
                                className="md:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-600"
                            >
                                <Menu className="w-6 h-6" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900 hidden sm:block">{title}</h1>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4">
                            {/* Search Bar */}
                            <div className="hidden md:flex items-center bg-gray-100 rounded-xl px-4 py-2.5 w-64 lg:w-96 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                <Search className="w-4 h-4 text-gray-500 mr-3" />
                                <input
                                    type="text"
                                    placeholder="Search users, events, logs..."
                                    className="bg-transparent border-none outline-none text-sm w-full placeholder-gray-500 text-gray-900"
                                />
                            </div>

                            {/* Notifications */}
                            <button className="p-2.5 hover:bg-gray-100 rounded-xl relative text-gray-500 hover:text-blue-600 transition-colors">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>

                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-3 pl-2 pr-1 py-1 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-200"
                                >
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                        {user?.name?.charAt(0) || 'A'}
                                    </div>
                                    <div className="hidden sm:block text-left mr-2">
                                        <p className="text-sm font-bold text-gray-900 leading-none">{user?.name || 'Admin'}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{user?.role || 'Administrator'}</p>
                                    </div>
                                </button>

                                {profileOpen && (
                                    <>
                                        <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setProfileOpen(false)}
                                        />
                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-100">
                                            <div className="px-4 py-3 border-b border-gray-50">
                                                <p className="text-sm font-medium text-gray-900">Signed in as</p>
                                                <p className="text-sm text-gray-500 truncate">{user?.email}</p>
                                            </div>
                                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                <User className="w-4 h-4" /> Profile
                                            </button>
                                            <button className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                                                <Settings className="w-4 h-4" /> Settings
                                            </button>
                                            <div className="border-t border-gray-50 my-1"></div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                            >
                                                <LogOut className="w-4 h-4" /> Sign Out
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
