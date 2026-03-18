import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import {
    Menu, X, Search, Bell, BarChart3, Users, FileText,
    Shield, Settings, LogOut, CheckSquare, Award, ClipboardList, Sparkles, ChevronRight, Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdminLayout = ({ children, title }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', icon: BarChart3, path: '/' },
        { name: 'Users', icon: Users, path: '/admin/users' },
        { name: 'Approvals', icon: CheckSquare, path: '/admin/approvals' },
        { name: 'Reports', icon: FileText, path: '/admin/reports' },
        { name: 'Credits & Rules', icon: Settings, path: '/admin/credits' },
        { name: 'Audit Logs', icon: FileText, path: '/audit-logs' },
    ];

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="min-h-screen page-bg">
            {/* ─── Navbar for Mobile / Top padding for md+ ─── */}
            <nav className="nav-dark sticky top-0 z-40 lg:hidden">
                <div className="px-4 mx-auto w-full sm:px-6">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
                                <img src="/gmu-logo.png" alt="GMU Logo" className="h-8 w-auto object-contain" />
                                <span className="text-lg font-bold text-white hidden sm:block">GM University</span>
                                <span className="hidden sm:block text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(239,68,68,0.15)', color: '#FCA5A5', border: '1px solid rgba(239,68,68,0.3)' }}>Admin</span>
                            </div>
                        </div>

                        {/* Search on mobile */}
                        <div className="hidden sm:flex flex-1 max-w-xs mx-4">
                            <div className="relative w-full">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-1.5 text-sm rounded-xl input-dark" />
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-xl hover:bg-white/5 relative text-slate-400 hover:text-white transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ─── Sidebar (Fixed on Desktop, Drawer on Mobile) ─── */}
            <>
                {/* Mobile Backdrop */}
                <AnimatePresence>
                    {menuOpen && (
                        <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
                    )}
                </AnimatePresence>

                {/* Sidebar Container */}
                <aside className={`fixed left-0 top-0 bottom-0 w-64 z-50 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                    style={{ background: 'rgba(11,15,26,0.95)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="p-6 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="flex items-center gap-2.5">
                            <img src="/gmu-logo.png" alt="GMU Logo" className="h-9 w-auto object-contain" />
                            <div>
                                <span className="text-base font-bold text-white block leading-tight">GM University</span>
                                <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Admin Panel</span>
                            </div>
                        </div>
                        <button onClick={() => setMenuOpen(false)} className="lg:hidden p-1 text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="p-4 mx-4 mt-4 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #EF4444, #EC4899)' }}>
                                {user?.name?.charAt(0) || 'A'}
                            </div>
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-white truncate">{user?.name || 'Administrator'}</p>
                                <p className="text-xs text-slate-400">System Admin</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 py-4 px-3 overflow-y-auto">
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-3">Menu</p>
                        <nav className="space-y-1.5">
                            {menuItems.map((item) => {
                                const active = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path));
                                return (
                                    <button key={item.name} onClick={() => { navigate(item.path); setMenuOpen(false); }} className={`nav-item ${active ? 'active' : ''}`}>
                                        <item.icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                                        <span className={`font-medium text-sm flex-1 ${active ? 'text-white' : 'text-slate-300'}`}>{item.name}</span>
                                        {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <button onClick={handleLogout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all"
                            style={{ color: 'rgba(252,165,165,0.8)' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </div>
                </aside>
            </>

            {/* ─── Main Content Area ─── */}
            <div className="lg:ml-64 flex flex-col min-h-screen">
                {/* Desktop Top Header */}
                <header className="hidden lg:flex items-center justify-between h-20 px-8 sticky top-0 z-30" style={{ background: 'rgba(11,15,26,0.8)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-4 flex-1">
                        <h1 className="text-xl font-bold text-white">{title}</h1>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input type="text" placeholder="Search anything..." className="w-full pl-9 pr-4 py-2 text-sm rounded-xl input-dark bg-opacity-50 hover:bg-opacity-100 transition-all focus:bg-white/5" />
                        </div>
                        <button className="p-2 rounded-xl text-slate-400 hover:text-white transition-all hover:bg-white/5 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-[#0B0F1A]" />
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-full">
                    {/* Mobile Title (hidden on desktop since it's in the header) */}
                    {title && <div className="mb-6 lg:hidden"><h1 className="text-2xl font-bold text-white">{title}</h1></div>}
                    
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
