import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import {
import API_URL from '../config/api';
    Calendar, MapPin, User, Tag, Clock, ArrowLeft,
    CheckCircle, AlertCircle, Share2, Award
} from 'lucide-react';

const EventDetails = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await axios.get(`http://localhost:5000/api/events/${id}`);
                setEvent(data);
            } catch (err) {
                setError('Failed to load event details');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchEvent();
    }, [id]);

    const handleRegister = async () => {
        if (!user) return navigate('/login');

        setRegistering(true);
        setError('');
        setSuccess('');

        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/registrations',
                { eventId: id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Successfully registered for this event!');
        } catch (err) {
            setError(err.response?.data?.message || 'Registration failed');
        } finally {
            setRegistering(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!event) {
        return (
            <StudentLayout user={user}>
                <div className="text-center py-12">
                    <h2 className="text-2xl font-bold text-gray-900">Event not found</h2>
                    <button onClick={() => navigate('/events')} className="mt-4 text-blue-600 hover:underline">
                        Back to Events
                    </button>
                </div>
            </StudentLayout>
        );
    }

    const isEventOver = new Date(event.date) < new Date();
    const isRegistrationClosed = event.status === 'closed';

    return (
        <StudentLayout user={user}>
            <div className="max-w-4xl mx-auto">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/events')}
                    className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Events
                </button>

                <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
                    {/* Hero Image */}
                    <div className="h-64 md:h-80 bg-gradient-to-r from-blue-600 to-indigo-700 relative">
                        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black to-transparent">
                            <span className="px-3 py-1 text-xs font-bold text-white bg-blue-500 rounded-lg mb-3 inline-block">
                                {event.category}
                            </span>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
                            <div className="flex items-center text-white/90 gap-4 text-sm md:text-base">
                                <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {new Date(event.date).toLocaleDateString()}</span>
                                <span className="flex items-center"><MapPin className="w-4 h-4 mr-2" /> {event.venue}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8">
                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900 mb-4">About Event</h3>
                                <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                                    {event.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-gray-900">Points</span>
                                    </div>
                                    <p className="text-2xl font-bold text-blue-600">{event.points} Credits</p>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-gray-900">Organizer</span>
                                    </div>
                                    <p className="text-lg font-bold text-purple-600 truncate">{event.organizer || 'College'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar / Actions */}
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                                <h3 className="font-bold text-gray-900 mb-4">Event Details</h3>
                                <ul className="space-y-4 text-sm">
                                    <li className="flex items-start">
                                        <Calendar className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Date</span>
                                            <span className="text-gray-500">{new Date(event.date).toLocaleDateString()}</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <Clock className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Time</span>
                                            <span className="text-gray-500">{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <MapPin className="w-5 h-5 text-gray-400 mr-3 mt-0.5" />
                                        <div>
                                            <span className="block font-medium text-gray-900">Venue</span>
                                            <span className="text-gray-500">{event.venue}</span>
                                        </div>
                                    </li>
                                </ul>

                                <hr className="my-6 border-gray-200" />

                                {success && (
                                    <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm flex items-start">
                                        <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                        {success}
                                    </div>
                                )}

                                {error && (
                                    <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start">
                                        <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                {isEventOver ? (
                                    <button disabled className="w-full py-3 px-4 bg-gray-100 text-gray-400 font-bold rounded-xl cursor-not-allowed">
                                        Event Ended
                                    </button>
                                ) : isRegistrationClosed ? (
                                    <button disabled className="w-full py-3 px-4 bg-red-50 text-red-400 font-bold rounded-xl cursor-not-allowed">
                                        Registration Closed
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRegister}
                                        disabled={registering || success}
                                        className={`w-full py-3 px-4 font-bold rounded-xl text-white shadow-lg shadow-blue-200 transition-all transform hover:scale-[1.02] ${success
                                                ? 'bg-green-500 hover:bg-green-600'
                                                : 'bg-blue-600 hover:bg-blue-700'
                                            }`}
                                    >
                                        {registering ? 'Registering...' : success ? 'Registered' : 'Register Now'}
                                    </button>
                                )}
                            </div>

                            <button className="w-full flex items-center justify-center py-3 px-4 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                                <Share2 className="w-4 h-4 mr-2" />
                                Share Event
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};

export default EventDetails;
