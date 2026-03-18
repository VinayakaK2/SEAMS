import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import { Calendar, MapPin, Clock, CheckCircle, XCircle, AlertCircle, QrCode } from 'lucide-react';
import API_URL from '../config/api';

const MyRegistrations = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [registrations, setRegistrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('pending'); // pending, verified, rejected

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                const token = localStorage.getItem('token');
                // Assuming endpoint exists, if not we might need to create it or use a different one
                // Based on typical REST design: GET /api/registrations/my
                const { data } = await axios.get('http://localhost:5000/api/registrations/my', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setRegistrations(data);
            } catch (error) {
                console.error('Error fetching registrations:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRegistrations();
    }, []);

    const filteredRegistrations = registrations.filter(reg => {
        if (activeTab === 'pending') return reg.status === 'pending';
        if (activeTab === 'verified') return reg.status === 'verified';
        if (activeTab === 'rejected') return reg.status === 'rejected';
        return true;
    });

    const getStatusColor = (status) => {
        switch (status) {
            case 'verified': return 'text-emerald-300 bg-emerald-500/20 border-emerald-500/30';
            case 'rejected': return 'text-red-300 bg-red-500/20 border-red-500/30';
            default: return 'text-yellow-300 bg-yellow-500/20 border-yellow-500/30';
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'verified': return <CheckCircle className="w-5 h-5" />;
            case 'rejected': return <XCircle className="w-5 h-5" />;
            default: return <AlertCircle className="w-5 h-5" />;
        }
    };

    return (
        <StudentLayout user={user} title="My Activities">
            {/* Tabs */}
            <div className="flex space-x-1 glass-card border border-white/10 p-1 max-w-md mb-8">
                {['pending', 'verified', 'rejected'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab
                                ? 'bg-white/10 text-white shadow-sm border border-white/10 shadow-glow'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#6366F1', borderRightColor: '#8B5CF6' }}></div>
                </div>
            ) : filteredRegistrations.length === 0 ? (
                <div className="text-center py-16 glass-card border border-white/10 border-dashed">
                    <div className="bg-white/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                        <Calendar className="w-8 h-8 text-indigo-400" />
                    </div>
                    <h3 className="text-lg font-medium text-white">No {activeTab} registrations</h3>
                    <p className="text-gray-400 mt-1">You don't have any events in this category.</p>
                    <button
                        onClick={() => navigate('/events')}
                        className="mt-6 px-6 py-2 btn-primary"
                    >
                        Browse Events
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredRegistrations.map((reg) => (
                        <div key={reg._id} className="glass-card p-6 border border-white/10 flex flex-col md:flex-row gap-6 items-start md:items-center hover:border-indigo-500/30 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_20px_rgba(99,102,241,0.1)]">
                            {/* Event Date Box */}
                            <div className="flex-shrink-0 w-full md:w-24 h-24 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex flex-col items-center justify-center text-indigo-400 shadow-inner">
                                <span className="text-xs font-bold uppercase">{new Date(reg.event.date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-2xl font-bold text-indigo-300">{new Date(reg.event.date).getDate()}</span>
                                <span className="text-xs opacity-75">{new Date(reg.event.date).getFullYear()}</span>
                            </div>

                            {/* Event Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(reg.status)}`}>
                                        {getStatusIcon(reg.status)}
                                        {reg.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs font-medium text-gray-300 bg-white/10 border border-white/10 px-2 py-1 rounded">
                                        {reg.event.category}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-white mb-1">{reg.event.title}</h3>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-400 mt-2">
                                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5 text-indigo-400" /> {new Date(reg.event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5 text-indigo-400" /> {reg.event.venue}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-auto mt-4 md:mt-0">
                                <button
                                    onClick={() => navigate(`/events/${reg.event._id}`)}
                                    className="px-6 py-2 text-sm font-medium text-gray-300 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white rounded-lg transition-colors shadow-sm"
                                >
                                    View Details
                                </button>
                                {reg.status === 'verified' && (
                                    <button className="px-6 py-2 text-sm font-medium text-white btn-primary flex items-center justify-center gap-2">
                                        <QrCode className="w-4 h-4" />
                                        Show QR
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </StudentLayout>
    );
};

export default MyRegistrations;
