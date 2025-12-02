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
            case 'verified': return 'text-green-600 bg-green-50 border-green-200';
            case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
            default: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
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
            <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl max-w-md mb-8">
                {['pending', 'verified', 'rejected'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg capitalize transition-all ${activeTab === tab
                                ? 'bg-white text-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredRegistrations.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 border-dashed">
                    <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Calendar className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">No {activeTab} registrations</h3>
                    <p className="text-gray-500 mt-1">You don't have any events in this category.</p>
                    <button
                        onClick={() => navigate('/events')}
                        className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Browse Events
                    </button>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredRegistrations.map((reg) => (
                        <div key={reg._id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 items-start md:items-center">
                            {/* Event Date Box */}
                            <div className="flex-shrink-0 w-full md:w-24 h-24 bg-blue-50 rounded-2xl flex flex-col items-center justify-center text-blue-600">
                                <span className="text-xs font-bold uppercase">{new Date(reg.event.date).toLocaleString('default', { month: 'short' })}</span>
                                <span className="text-2xl font-bold">{new Date(reg.event.date).getDate()}</span>
                                <span className="text-xs opacity-75">{new Date(reg.event.date).getFullYear()}</span>
                            </div>

                            {/* Event Info */}
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 ${getStatusColor(reg.status)}`}>
                                        {getStatusIcon(reg.status)}
                                        {reg.status.toUpperCase()}
                                    </span>
                                    <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {reg.event.category}
                                    </span>
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">{reg.event.title}</h3>
                                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-2">
                                    <span className="flex items-center"><Clock className="w-4 h-4 mr-1.5" /> {new Date(reg.event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    <span className="flex items-center"><MapPin className="w-4 h-4 mr-1.5" /> {reg.event.venue}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-3 w-full md:w-auto">
                                <button
                                    onClick={() => navigate(`/events/${reg.event._id}`)}
                                    className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    View Details
                                </button>
                                {reg.status === 'verified' && (
                                    <button className="px-6 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center gap-2 transition-colors">
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
