import { useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import StudentLayout from '../components/StudentLayout';
import CoordinatorLayout from '../components/CoordinatorLayout';
import AdminLayout from '../components/AdminLayout';
import {
    TrendingUp, Users, Calendar, Award, Clock, PlusCircle, QrCode, FileText,
    ArrowRight, Star, BarChart3
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import axios from 'axios';
import API_URL from '../config/api';

const StudentDashboard = ({ user, navigate }) => {
    const socket = useSocket();
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    useEffect(() => {
        // Fetch initial events
        fetchUpcomingEvents();
    }, []);

    useEffect(() => {
        if (!socket) return;

        // Listen for newly approved events
        socket.on('event_approved', (newEvent) => {
            console.log('New event approved:', newEvent);
            setUpcomingEvents(prev => [newEvent, ...prev].slice(0, 5)); // Keep only 5 most recent
        });

        return () => {
            socket.off('event_approved');
        };
    }, [socket]);

    const fetchUpcomingEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get('http://localhost:5000/api/events?status=approved', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUpcomingEvents(data.slice(0, 5)); // Get latest 5 events
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    // Mock Data
    const participationData = [
        { name: 'Tech', credits: 450, color: '#818CF8' },
        { name: 'Arts', credits: 300, color: '#F472B6' },
        { name: 'Sports', credits: 200, color: '#34D399' },
        { name: 'Social', credits: 150, color: '#FBBF24' },
        { name: 'Lead', credits: 140, color: '#60A5FA' },
    ];

    const stats = [
        { label: 'Total Credits', value: '1,240', icon: Award, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Categories', value: '4', icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Events', value: '3', icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
    ];

    const badges = [
        { name: 'Tech Enthusiast', icon: '💻', earned: true },
        { name: 'All Rounder', icon: '🌟', earned: true },
        { name: 'Sports Champ', icon: '🏆', earned: true },
        { name: 'Leader', icon: '👑', earned: true },
        { name: 'Academic Ace', icon: '📚', earned: false },
        { name: 'Community Star', icon: '🤝', earned: false },
    ];

    return (
        <StudentLayout user={user} title="Dashboard">
            {/* Welcome Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}! 👋</h2>
                <p className="text-gray-500">Here's what's happening with your participation today.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-transform hover:scale-105">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Chart Section */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Participation Breakdown</h3>
                        <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">+15% All Time</span>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={participationData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="credits" radius={[6, 6, 0, 0]}>
                                    {participationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Badges Section */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">My Achievements</h3>
                        <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {badges.map((badge, index) => (
                            <div key={index} className={`flex flex-col items-center p-3 rounded-xl border ${badge.earned ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100 opacity-50 grayscale'}`}>
                                <span className="text-2xl mb-2">{badge.icon}</span>
                                <span className="text-[10px] font-bold text-center text-gray-700 leading-tight">{badge.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <button onClick={() => navigate('/events')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-blue-500 hover:shadow-md transition-all group text-left">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors mb-4">
                        <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Browse Events</h4>
                    <p className="text-sm text-gray-500">Discover new activities</p>
                </button>
                <button onClick={() => navigate('/scan-qr')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-purple-500 hover:shadow-md transition-all group text-left">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors mb-4">
                        <QrCode className="w-6 h-6 text-purple-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">Scan QR Code</h4>
                    <p className="text-sm text-gray-500">Mark attendance</p>
                </button>
                <button onClick={() => navigate('/my-activities')} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-green-500 hover:shadow-md transition-all group text-left">
                    <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors mb-4">
                        <Award className="w-6 h-6 text-green-600" />
                    </div>
                    <h4 className="font-bold text-gray-900 mb-1">My Activities</h4>
                    <p className="text-sm text-gray-500">View registrations</p>
                </button>
            </div>

            {/* Recommended Events */}
            <div className="mt-8">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-gray-900">Recommended For You</h3>
                    <button onClick={() => navigate('/events')} className="flex items-center text-gray-500 hover:text-blue-600 transition-colors">
                        View All <ArrowRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[1, 2, 3].map((item) => (
                        <div key={item} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="h-32 bg-gradient-to-r from-indigo-500 to-purple-500 relative">
                                <div className="absolute top-4 right-4 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-bold">
                                    Technical
                                </div>
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                                    <Calendar className="w-3 h-3" /> <span>Oct 24, 2023</span>
                                </div>
                                <h4 className="font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">AI & Machine Learning Workshop</h4>
                                <div className="flex justify-between items-center mt-4">
                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">50 Points</span>
                                    <button onClick={() => navigate('/events')} className="text-sm font-medium text-gray-600 hover:text-gray-900">View Details</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
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
            {/* Welcome Section */}
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user.name.split(' ')[0]}! 👋</h2>
                <p className="text-gray-500">Here's an overview of your event management activities.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Events */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Recent Events</h3>
                        <button onClick={() => navigate('/coordinator/manage-events')} className="text-blue-600 text-sm font-medium hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Event Name</th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Category</th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recentEvents.map((event) => (
                                    <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6 text-sm font-medium text-gray-900">{event.name}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{event.date}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{event.category}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${event.status === 'Upcoming' ? 'bg-blue-100 text-blue-800' :
                                                event.status === 'Completed' ? 'bg-green-100 text-green-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <button className="text-gray-400 hover:text-blue-600 transition-colors">
                                                <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Quick Actions</h3>
                    <div className="space-y-4">
                        <button onClick={() => navigate('/create-event')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                                <PlusCircle className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Create Event</h4>
                                <p className="text-xs text-gray-500">Host a new activity</p>
                            </div>
                        </button>
                        <button onClick={() => navigate('/coordinator/manage-participants')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-purple-500 hover:bg-purple-50 transition-all group text-left">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                <Users className="w-5 h-5 text-purple-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Manage Participants</h4>
                                <p className="text-xs text-gray-500">View registrations</p>
                            </div>
                        </button>
                        <button onClick={() => navigate('/coordinator/reports')} className="w-full flex items-center gap-3 p-4 rounded-xl border border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group text-left">
                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                <FileText className="w-5 h-5 text-green-600" />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Generate Report</h4>
                                <p className="text-xs text-gray-500">Download stats</p>
                            </div>
                        </button>
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
        { name: 'Mon', count: 45 },
        { name: 'Tue', count: 52 },
        { name: 'Wed', count: 38 },
        { name: 'Thu', count: 65 },
        { name: 'Fri', count: 48 },
        { name: 'Sat', count: 25 },
        { name: 'Sun', count: 15 },
    ];

    const categoryDistribution = [
        { name: 'Technical', value: 45, color: '#3B82F6' },
        { name: 'Cultural', value: 30, color: '#8B5CF6' },
        { name: 'Sports', value: 15, color: '#10B981' },
        { name: 'Social', value: 10, color: '#F59E0B' },
    ];

    const stats = [
        { label: 'Total Students', value: '2,543', change: '+12%', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total Events', value: '145', change: '+5%', icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Active Today', value: '342', change: '+18%', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Pending Approvals', value: '12', change: '-2', icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    ];

    const topStudents = [
        { name: 'Alice Johnson', dept: 'CSE', credits: 1250 },
        { name: 'Bob Smith', dept: 'ISE', credits: 1100 },
        { name: 'Charlie Brown', dept: 'ECE', credits: 980 },
    ];

    const recentLogs = [
        { action: 'User Registered', user: 'John Doe', time: '2 mins ago', status: 'success' },
        { action: 'Event Approved', user: 'Admin', time: '15 mins ago', status: 'success' },
        { action: 'Login Failed', user: 'Unknown', time: '1 hour ago', status: 'failed' },
    ];

    return (
        <AdminLayout user={user} title="Dashboard">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.bg}`}>
                                <stat.icon className={`w-6 h-6 ${stat.color}`} />
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                                <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
                            </div>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.change.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                            }`}>
                            {stat.change}
                        </span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
                {/* Participation Trend Graph */}
                <div className="lg:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Participation Trend</h3>
                        <select className="text-sm border-gray-200 rounded-lg text-gray-500 focus:ring-blue-500">
                            <option>Last 7 Days</option>
                            <option>Last 30 Days</option>
                        </select>
                    </div>
                    <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={participationTrend}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                                <Tooltip
                                    cursor={{ fill: '#F3F4F6' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                />
                                <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Category Distribution */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-6">Category Distribution</h3>
                    <div className="space-y-4">
                        {categoryDistribution.map((cat, index) => (
                            <div key={index} className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }}></div>
                                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                                </div>
                                <span className="text-sm font-bold text-gray-900">{cat.value}%</span>
                            </div>
                        ))}
                    </div>
                    {/* Placeholder for Pie Chart if needed, or just list for simplicity */}
                    <div className="mt-6 h-32 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-xs">
                        Pie Chart Visualization
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Top Students Leaderboard */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-900">Top Students</h3>
                        <button className="text-blue-600 text-sm font-medium hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Name</th>
                                    <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Dept</th>
                                    <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topStudents.map((student, index) => (
                                    <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6 text-sm font-medium text-gray-900 flex items-center gap-3">
                                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                                                {index + 1}
                                            </div>
                                            {student.name}
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{student.dept}</td>
                                        <td className="py-4 px-6 text-right text-sm font-bold text-blue-600">{student.credits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Recent Activity Log */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                        <button onClick={() => navigate('/audit-logs')} className="text-blue-600 text-sm font-medium hover:underline">View Logs</button>
                    </div>
                    <div className="space-y-6">
                        {recentLogs.map((log, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div className={`w-2 h-2 mt-2 rounded-full ${log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                                    <p className="text-xs text-gray-500">by {log.user} • {log.time}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Quick Actions */}
                    <div className="mt-8 pt-6 border-t border-gray-100">
                        <h4 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h4>
                        <div className="flex gap-3">
                            <button onClick={() => navigate('/admin/users')} className="flex-1 py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors">
                                Add User
                            </button>
                            <button onClick={() => navigate('/admin/reports')} className="flex-1 py-2.5 bg-purple-50 text-purple-600 rounded-xl text-sm font-medium hover:bg-purple-100 transition-colors">
                                View Reports
                            </button>
                        </div>
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
        return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;
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
