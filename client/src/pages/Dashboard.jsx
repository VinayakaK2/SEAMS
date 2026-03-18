import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StudentLayout from '../components/StudentLayout';
import CoordinatorLayout from '../components/CoordinatorLayout';
import AdminLayout from '../components/AdminLayout';
import {
    TrendingUp, Users, Calendar, Award, Clock, PlusCircle, QrCode, FileText,
    ArrowRight, Star, BarChart3, CheckCircle, XCircle
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import axios from 'axios';
import API_URL from '../config/api';

const StudentDashboard = ({ user, navigate }) => {
    const socket = useSocket();
    const [recommendedEvents, setRecommendedEvents] = useState([]);
    const [isLoadingRecs, setIsLoadingRecs] = useState(true);

    useEffect(() => {
        // Fetch initial events
        fetchUpcomingEvents();
        fetchRecommendations();
    }, []);

    const fetchRecommendations = async () => {
        try {
            setIsLoadingRecs(true);
            const token = localStorage.getItem('token');
            const { data } = await axios.get('http://localhost:5000/api/events/recommended', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRecommendedEvents(data.events || []);
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        } finally {
            setIsLoadingRecs(false);
        }
    };

    // ... (rest of the component logic)

    return (
        <StudentLayout user={user} title="Dashboard">
            {/* ... (Welcome and Stats sections) */}
            
            {/* Recommended Events */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="section-title">Recommended For You</h3>
                    <button onClick={() => navigate('/events')} className="flex items-center text-slate-400 hover:text-indigo-400 transition-colors text-sm">
                        View All <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
                
                {isLoadingRecs ? (
                    <div className="flex justify-center py-12">
                        <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
                    </div>
                ) : recommendedEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recommendedEvents.map((event) => (
                            <div key={event.id} className="glass-card overflow-hidden group hover:border-indigo-500/30 transition-all cursor-pointer"
                                onClick={() => navigate(`/events/${event.id}`)}
                                onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4),0 0 20px rgba(99,102,241,0.08)'}
                                onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                                <div className="h-32 relative" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                                    {event.category && (
                                        <div className="absolute top-4 right-4 px-3 py-1 rounded-full text-white text-xs font-bold" style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
                                            {event.category}
                                        </div>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                                        <Calendar className="w-3 h-3" /> <span>{new Date(event.date).toLocaleDateString()}</span>
                                    </div>
                                    <h4 className="font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors line-clamp-1">{event.title}</h4>
                                    <div className="flex justify-between items-center mt-4">
                                        <span className="text-xs font-bold badge-dark">{event.points} Points</span>
                                        <span className="text-sm font-medium text-slate-400 hover:text-white transition-colors">View Details</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="glass-card p-12 text-center">
                        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4 opacity-20" />
                        <p className="text-slate-400">No recommendations found yet. Interaction with events to get personalized suggestions!</p>
                    </div>
                )}
            </div>
        </StudentLayout>
    );
};

const CoordinatorDashboard = ({ user, navigate }) => {
    const socket = useSocket();
    const [stats, setStats] = useState([
        { label: 'Total Events', value: '0', icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Pending Approvals', value: '0', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Total Participants', value: '0', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Completion %', value: '0%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    ]);
    const [recentEvents, setRecentEvents] = useState([]);

    useEffect(() => {
        fetchCoordinatorData();
    }, []);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        socket.on('event_created', () => {
            fetchCoordinatorData();
        });

        socket.on('event_updated', () => {
            fetchCoordinatorData();
        });

        socket.on('event_deleted', () => {
            fetchCoordinatorData();
        });

        socket.on('event_status_updated', () => {
            fetchCoordinatorData();
        });

        return () => {
            socket.off('event_created');
            socket.off('event_updated');
            socket.off('event_deleted');
            socket.off('event_status_updated');
        };
    }, [socket]);

    const fetchCoordinatorData = async () => {
        try {
            const token = localStorage.getItem('token');
            // Use optimized aggregation endpoint
            const { data: myEvents } = await axios.get('http://localhost:5000/api/events/coordinator/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });

            // Get recent 5 events sorted by creation date
            const recent = myEvents
                .slice(0, 5)
                .map(event => ({
                    id: event._id,
                    name: event.title,
                    date: new Date(event.date).toLocaleDateString(),
                    category: event.category,
                    status: event.status
                }));

            setRecentEvents(recent);

            // Calculate stats
            const totalEvents = myEvents.length;
            const pendingEvents = myEvents.filter(e => e.status === 'pending').length;
            const totalParticipants = myEvents.reduce((sum, e) => sum + (e.registeredCount || 0), 0);
            const completedEvents = myEvents.filter(e => e.status === 'approved').length;
            const completionPercentage = totalEvents > 0 ? Math.round((completedEvents / totalEvents) * 100) : 0;

            setStats([
                { label: 'Total Events', value: totalEvents.toString(), icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
                { label: 'Pending Approvals', value: pendingEvents.toString(), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
                { label: 'Total Participants', value: totalParticipants.toString(), icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
                { label: 'Completion %', value: `${completionPercentage}%`, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
            ]);
        } catch (error) {
            console.error('Error fetching coordinator data:', error);
        }
    };

    return (
        <CoordinatorLayout user={user} title="Dashboard">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">Welcome back, {user.name.split(' ')[0]}! 👋</h2>
                <p className="section-sub">Here's an overview of your event management activities.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="stat-card flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-white">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 glass-card overflow-hidden">
                    <div className="p-6 border-b flex justify-between items-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <h3 className="section-title">Recent Events</h3>
                        <button onClick={() => navigate('/coordinator/manage-events')} className="text-indigo-400 text-sm font-medium hover:text-indigo-300 transition-colors">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr style={{ background: 'rgba(255,255,255,0.03)' }}>
                                    <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Event Name</th>
                                    <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                                    <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                                    <th className="text-left py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                                    <th className="text-right py-3.5 px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEvents.map((event) => (
                                    <tr key={event.id} className="border-b transition-colors" style={{ borderColor: 'rgba(255,255,255,0.04)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <td className="py-4 px-6 text-sm font-medium text-white">{event.name}</td>
                                        <td className="py-4 px-6 text-sm text-slate-400">{event.date}</td>
                                        <td className="py-4 px-6 text-sm text-slate-400">{event.category}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                event.status === 'approved' ? 'badge-success' :
                                                event.status === 'pending' ? 'badge-warning' : 'badge-dark'
                                            }`}>{event.status}</span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-slate-500 hover:text-indigo-400 transition-colors"><ArrowRight className="w-4 h-4" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="section-title mb-6">Quick Actions</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Create Event', sub: 'Host a new activity', icon: PlusCircle, gradient: 'linear-gradient(135deg,#3B82F6,#6366F1)', path: '/create-event' },
                            { label: 'Manage Participants', sub: 'View registrations', icon: Users, gradient: 'linear-gradient(135deg,#8B5CF6,#EC4899)', path: '/coordinator/manage-participants' },
                            { label: 'Generate Report', sub: 'Download stats', icon: FileText, gradient: 'linear-gradient(135deg,#10B981,#3B82F6)', path: '/coordinator/reports' },
                        ].map((action) => (
                            <button key={action.label} onClick={() => navigate(action.path)}
                                className="w-full flex items-center gap-3 p-4 rounded-xl transition-all group text-left"
                                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: action.gradient }}>
                                    <action.icon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-white text-sm">{action.label}</h4>
                                    <p className="text-xs text-slate-500">{action.sub}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </CoordinatorLayout>
    );
};

const AdminDashboard = ({ navigate }) => {
    const { user } = useContext(AuthContext);

    // Mock Data for Charts
    const participationTrend = [
        { name: 'Mon', count: 45 }, { name: 'Tue', count: 52 }, { name: 'Wed', count: 38 },
        { name: 'Thu', count: 65 }, { name: 'Fri', count: 48 }, { name: 'Sat', count: 25 }, { name: 'Sun', count: 15 },
    ];

    const sparklineData = [
        { value: 10 }, { value: 25 }, { value: 15 }, { value: 30 }, { value: 20 }, { value: 35 }, { value: 25 }
    ];

    const stats = [
        { label: 'Total Students', value: '2,543', change: '+12%', icon: Users, color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
        { label: 'Total Events', value: '145', change: '+5%', icon: Calendar, color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
        { label: 'Active Today', value: '342', change: '+18%', icon: TrendingUp, color: '#10B981', bg: 'rgba(16,185,129,0.1)' },
        { label: 'Pending Approvals', value: '12', change: '-2', icon: Clock, color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    ];

    const topStudents = [
        { name: 'Alice Johnson', dept: 'CSE', credits: 1250 },
        { name: 'Bob Smith', dept: 'ISE', credits: 1100 },
        { name: 'Charlie Brown', dept: 'ECE', credits: 980 },
        { name: 'Diana Prince', dept: 'CSE', credits: 950 },
    ];

    const departmentStats = [
        { name: 'Computer Science', value: 85, color: '#3B82F6' },
        { name: 'Information Science', value: 72, color: '#8B5CF6' },
        { name: 'Electronics', value: 64, color: '#10B981' },
    ];

    const recentLogs = [
        { action: 'New Student Registration', user: 'akash@seams.edu', time: '2 mins ago', type: 'info', icon: Users },
        { action: 'Event Registration Approved', user: 'Admin', time: '15 mins ago', type: 'success', icon: CheckCircle },
        { action: 'Tech Symposium Request', user: 'Prof. Ramesh', time: '1 hour ago', type: 'warning', icon: Clock },
        { action: 'Failed Login Attempt', user: '192.168.1.5', time: '3 hours ago', type: 'error', icon: XCircle },
    ];

    return (
        <AdminLayout user={user} title="Overview">
            {/* Top Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8 w-full">
                {stats.map((stat, index) => (
                    <div key={index} className="glass-card relative overflow-hidden group hover:border-indigo-500/30 transition-all cursor-pointer"
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4),0 0 20px rgba(99,102,241,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = ''}>
                        <div className="p-5 relative z-10 flex flex-col h-full justify-between">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: stat.bg }}>
                                        <stat.icon size={20} color={stat.color} />
                                    </div>
                                    <p className="text-sm font-medium text-slate-400">{stat.label}</p>
                                </div>
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${stat.change.startsWith('+') ? 'text-emerald-400 bg-emerald-400/10' : 'text-slate-400 bg-white/5'}`}>
                                    {stat.change}
                                </span>
                            </div>
                            <div className="flex items-end justify-between">
                                <h3 className="text-3xl font-bold text-white">{stat.value}</h3>
                            </div>
                        </div>
                        {/* Sparkline Background */}
                        <div className="absolute bottom-0 left-0 right-0 h-16 opacity-30 group-hover:opacity-50 transition-opacity pointer-events-none">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparklineData}>
                                    <defs>
                                        <linearGradient id={`color${index}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={stat.color} stopOpacity={0.8}/>
                                            <stop offset="95%" stopColor={stat.color} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <Area type="monotone" dataKey="value" stroke={stat.color} fillOpacity={1} fill={`url(#color${index})`} strokeWidth={2} isAnimationActive={false} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Layout Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8 w-full">
                
                {/* Left Column (Main Chart) */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="glass-card p-6 min-h-[400px]">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white">Platform Activity</h3>
                                <p className="text-xs text-slate-400 mt-1">Daily active participation trends</p>
                            </div>
                            <select className="input-dark text-xs py-1.5 px-3 w-auto bg-black/40 border-white/10 rounded-lg">
                                <option>Last 7 Days</option>
                                <option>Last 30 Days</option>
                                <option>This Year</option>
                            </select>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={participationTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#6366F1" stopOpacity={0.5}/>
                                            <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} />
                                    <Tooltip 
                                        contentStyle={{ background: 'rgba(15,23,42,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#F8FAFC', backdropFilter: 'blur(10px)' }}
                                        itemStyle={{ color: '#E2E8F0' }}
                                    />
                                    <Area type="monotone" dataKey="count" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    
                    {/* Bottom Section: Leaderboard & Departments */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Leaderboard */}
                        <div className="glass-card">
                            <div className="p-5 border-b border-white/5 flex justify-between items-center">
                                <h3 className="font-bold text-white flex items-center gap-2"><Award className="w-5 h-5 text-indigo-400"/> Top Performers</h3>
                                <button className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold">View All</button>
                            </div>
                            <div className="p-2">
                                {topStudents.map((student, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs" 
                                                style={{ background: idx === 0 ? 'linear-gradient(135deg, #F59E0B, #D97706)' : idx === 1 ? 'linear-gradient(135deg, #9ca3af, #6b7280)' : idx === 2 ? 'linear-gradient(135deg, #b45309, #78350f)' : 'rgba(255,255,255,0.1)' }}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-white">{student.name}</p>
                                                <p className="text-[10px] text-slate-400">{student.dept}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-400">{student.credits} pts</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Department Stats */}
                        <div className="glass-card p-5 flex flex-col justify-between">
                            <h3 className="font-bold text-white mb-6">Department Engagement</h3>
                            <div className="space-y-5">
                                {departmentStats.map((dept, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between items-end mb-2">
                                            <span className="text-sm text-slate-300">{dept.name}</span>
                                            <span className="text-xs font-bold text-white">{dept.value}%</span>
                                        </div>
                                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }} 
                                                animate={{ width: `${dept.value}%` }} 
                                                transition={{ duration: 1, delay: idx * 0.2 }}
                                                className="h-full rounded-full" 
                                                style={{ background: dept.color }} 
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button className="w-full mt-6 py-2.5 rounded-xl border border-white/10 text-xs font-bold text-white hover:bg-white/5 transition-colors">
                                View Full Report
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column (Activity Panel) */}
                <div className="glass-card flex flex-col h-[calc(400px+2rem+350px)] sticky top-28">
                    <div className="p-6 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h3 className="font-bold text-white">Activity Log</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Live platform updates</p>
                        </div>
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {recentLogs.map((log, index) => {
                            const colors = {
                                info: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
                                success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
                                warning: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
                                error: 'text-red-400 bg-red-400/10 border-red-400/20'
                            };
                            return (
                                <div key={index} className="flex gap-4 group">
                                    <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${colors[log.type]}`}>
                                        <log.icon size={14} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-white group-hover:text-indigo-300 transition-colors leading-tight">{log.action}</p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-[10px] font-medium text-slate-400">{log.user}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                            <span className="text-[10px] text-slate-500">{log.time}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    
                    <div className="p-5 border-t border-white/5 bg-black/20 rounded-b-2xl">
                        <button onClick={() => navigate('/admin/approvals')} className="w-full flex justify-between items-center py-2.5 px-4 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 transition-colors text-sm font-medium">
                            <span>Review Pending (12)</span>
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </div>

            </div>
        </AdminLayout>
    );
};

const Dashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!user) {
        return <div className="flex justify-center items-center h-screen page-bg"><div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#6366F1', borderRightColor: '#8B5CF6' }}></div></div>;
    }

    if (user.role === 'student') {
        return <StudentDashboard user={user} navigate={navigate} />;
    } else if (user.role === 'coordinator' || user.role === 'faculty') {
        return <CoordinatorDashboard user={user} navigate={navigate} />;
    } else if (user.role === 'admin') {
        return <AdminDashboard navigate={navigate} />;
    } else {
        return <div className="p-8 text-center text-gray-500">Unknown Role</div>;
    }
};

export default Dashboard;
