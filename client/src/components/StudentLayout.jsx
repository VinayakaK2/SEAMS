import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import {
    Menu, X, Search, Bell, User, TrendingUp, Award, Calendar,
    Trophy, GraduationCap, LogOut
} from 'lucide-react';

const StudentLayout = ({ children, title, user }) => {
    const { logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', icon: TrendingUp, path: '/' },
        { name: 'Events', icon: Calendar, path: '/events' },
        { name: 'My Activities', icon: Award, path: '/my-activities' },
        { name: 'Leaderboard', icon: Trophy, path: '/leaderboard' },
        { name: 'Profile', icon: User, path: '/profile' },
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Top Navbar */}
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        {/* Left: Logo + Menu Button */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setMenuOpen(!menuOpen)}
                                className="p-2 rounded-lg hover:bg-gray-100"
                            >
                                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <GraduationCap className="w-5 h-5 text-white" />
                                </div>
                                <h1 className="text-xl font-bold text-gray-900">SEAMS</h1>
                            </div>
                        </div>

                        {/* Center: Search Bar (Optional, can be passed as prop or global) */}
                        <div className="hidden md:flex flex-1 max-w-md mx-8">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search events, activities..."
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Right: Notifications + Profile */}
                        <div className="flex items-center gap-4">
                            <button className="p-2 rounded-lg hover:bg-gray-100 relative">
                                <Bell className="w-6 h-6 text-gray-600" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                            </button>
                            <button onClick={() => navigate('/profile')} className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-blue-600 font-semibold text-sm">{user?.name?.[0]?.toUpperCase()}</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Side Menu Overlay */}
            {menuOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-40" onClick={() => setMenuOpen(false)}>
                    <div
                        className="bg-white w-64 h-full shadow-xl transform transition-transform duration-300 ease-in-out"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-6 flex flex-col h-full">
                            <div className="mb-8 flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                                    <GraduationCap className="w-6 h-6 text-white" />
                                </div>
                                <span className="text-xl font-bold text-gray-900">SEAMS</span>
                            </div>

                            <div className="mb-6">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Menu</h3>
                                <nav className="space-y-2">
                                    {menuItems.map((item) => (
                                        <button
                                            key={item.name}
                                            onClick={() => { navigate(item.path); setMenuOpen(false); }}
                                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${location.pathname === item.path
                                                    ? 'bg-blue-50 text-blue-600 font-medium'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                                }`}
                                        >
                                            <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-blue-600' : 'text-gray-400'}`} />
                                            {item.name}
                                        </button>
                                    ))}
                                </nav>
                            </div>

                            <div className="mt-auto pt-6 border-t border-gray-100">
                                <button
                                    onClick={() => { logout(); setMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-red-50 text-red-600 flex items-center gap-3 transition-colors"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Logout
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="py-8 px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {title && (
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
                    </div>
                )}
                {children}
            </main>
        </div>
    );
};

export default StudentLayout;
