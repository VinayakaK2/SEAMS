import { useState, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import {
    Menu, X, Search, Bell, BarChart3, PlusCircle, Calendar,
    Users, FileText, LogOut, Sparkles, ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CoordinatorLayout = ({ children, title }) => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);

    const menuItems = [
        { name: 'Dashboard', icon: BarChart3, path: '/' },
        { name: 'Create Event', icon: PlusCircle, path: '/create-event' },
        { name: 'Manage Events', icon: Calendar, path: '/coordinator/manage-events' },
        { name: 'Participants', icon: Users, path: '/coordinator/manage-participants' },
        { name: 'Reports', icon: FileText, path: '/coordinator/reports' },
    ];

    const handleLogout = () => { logout(); navigate('/login'); };

    return (
        <div className="min-h-screen page-bg flex">
            {/* ─── Mobile Navbar ─── */}
            <nav className="nav-dark sticky top-0 z-40 lg:hidden w-full">
                <div className="px-4 mx-auto w-full sm:px-6">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                            </button>
                            <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => navigate('/')}>
                                <img src="/gmu-logo.png" alt="GMU Logo" className="h-8 w-auto object-contain" />
                                <span className="text-lg font-bold text-white hidden sm:block">GM University</span>
                                <span className="hidden sm:block text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.2)', color: '#A5B4FC', border: '1px solid rgba(99,102,241,0.3)' }}>Coordinator</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 rounded-xl hover:bg-white/5 relative text-slate-400 hover:text-white transition-all">
                                <Bell className="w-5 h-5" />
                                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full ring-1 ring-dark-400" />
                            </button>
                            <button className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold text-white hover:bg-white/5 transition-all" style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                                {user?.name?.[0]?.toUpperCase()}
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* ─── Desktop Fixed Sidebar ─── */}
            <aside className="fixed left-0 top-0 bottom-0 w-64 z-50 hidden lg:flex flex-col" style={{ background: 'rgba(11,15,26,0.95)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="h-20 flex items-center gap-3 px-6 border-b cursor-pointer" style={{ borderColor: 'rgba(255,255,255,0.06)' }} onClick={() => navigate('/')}>
                    <img src="/gmu-logo.png" alt="GMU Logo" className="h-9 w-auto object-contain" />
                    <div>
                        <span className="text-lg font-bold text-white tracking-wide block leading-tight">GM University</span>
                        <span className="text-[10px] text-indigo-400 font-medium tracking-wider uppercase">Coordinator</span>
                    </div>
                </div>
                
                <div className="flex-1 py-6 px-4 overflow-y-auto space-y-1 custom-scrollbar">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-4">Navigation</p>
                    {menuItems.map((item) => {
                        const active = location.pathname === item.path;
                        return (
                            <button key={item.name} onClick={() => navigate(item.path)} className={`nav-item ${active ? 'active' : ''}`}>
                                <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                                <span className="font-medium text-sm flex-1 text-left">{item.name}</span>
                                {active && <ChevronRight className="w-4 h-4 opacity-60" />}
                            </button>
                        );
                    })}
                </div>

                <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="flex items-center gap-3 mb-4 px-2">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shadow-lg" style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                            {user?.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="overflow-hidden flex-1">
                            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group" style={{ color: 'rgba(252,165,165,0.8)', background: 'rgba(239,68,68,0.05)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}>
                        <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* ─── Mobile Sidebar Drawer ─── */}
            <AnimatePresence>
                {menuOpen && (
                    <>
                        <motion.div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMenuOpen(false)} />
                        <motion.div className="fixed left-0 top-0 bottom-0 w-72 z-50 flex flex-col lg:hidden" style={{ background: 'rgba(11,15,26,0.95)', backdropFilter: 'blur(24px)', borderRight: '1px solid rgba(255,255,255,0.06)' }} initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}>
                            <div className="p-6 flex items-center justify-between border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="flex items-center gap-2.5">
                                    <img src="/gmu-logo.png" alt="GMU Logo" className="h-9 w-auto object-contain" />
                                    <div>
                                        <span className="text-base font-bold text-white block leading-tight">GM University</span>
                                        <span className="text-xs text-slate-500">Coordinator Panel</span>
                                    </div>
                                </div>
                                <button onClick={() => setMenuOpen(false)} className="p-1 text-slate-500 hover:text-white transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="p-4 mx-4 mt-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold text-white" style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
                                        {user?.name?.[0]?.toUpperCase()}
                                    </div>
                                    <div className="overflow-hidden">
                                        <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
                                        <p className="text-xs text-slate-400 truncate">Coordinator</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 py-4 px-3 overflow-y-auto">
                                <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-3">Navigation</p>
                                <nav className="space-y-1">
                                    {menuItems.map((item) => {
                                        const active = location.pathname === item.path;
                                        return (
                                            <button key={item.name} onClick={() => { navigate(item.path); setMenuOpen(false); }} className={`nav-item ${active ? 'active' : ''}`}>
                                                <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                                                <span className="font-medium text-sm flex-1 text-left">{item.name}</span>
                                                {active && <ChevronRight className="w-3.5 h-3.5 opacity-60" />}
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                <button onClick={() => { handleLogout(); setMenuOpen(false); }} className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium" style={{ color: 'rgba(252,165,165,0.8)', background: 'rgba(239,68,68,0.05)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239,68,68,0.05)'}>
                                    <LogOut className="w-4 h-4" />
                                    Sign Out
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ─── Main Content Wrapper ─── */}
            <div className="lg:ml-64 flex flex-col min-h-screen w-full">
                {/* Desktop Header */}
                <header className="hidden lg:flex items-center justify-between h-20 px-8 sticky top-0 z-30 border-b" style={{ background: 'rgba(11,15,26,0.8)', backdropFilter: 'blur(12px)', borderColor: 'rgba(255,255,255,0.06)' }}>
                    <h1 className="text-2xl font-bold tracking-tight text-white">{title || 'Dashboard'}</h1>
                    
                    <div className="flex items-center gap-6">
                        {/* Search */}
                        <div className="relative w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input type="text" placeholder="Search..." className="w-full pl-9 pr-4 py-2 text-sm rounded-xl input-dark" />
                        </div>
                        
                        <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-pink-500 ring-2 ring-slate-900 border-none"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-full">
                    {/* Render title on mobile only, since desktop has header */}
                    {title && (
                        <div className="lg:hidden mb-6">
                            <h1 className="text-2xl font-bold tracking-tight text-white">{title}</h1>
                        </div>
                    )}
                    {children}
                </main>
            </div>
        </div>
    );
};

export default CoordinatorLayout;
