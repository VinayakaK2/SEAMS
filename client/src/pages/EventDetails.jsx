import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import {
    Calendar, MapPin, User, Tag, Clock, ArrowLeft,
    CheckCircle, AlertCircle, Share2, Award, Heart
} from 'lucide-react';
import API_URL from '../config/api';

const EventDetails = () => {
    const { id } = useParams();
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [registering, setRegistering] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [liked, setLiked] = useState(false);

    useEffect(() => {
        const fetchEvent = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/events/${id}`);
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
            await axios.post(`${API_URL}/api/registrations`,
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

    const handleLike = async () => {
        if (!user) return navigate('/login');
        if (liked) return;

        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/events/${id}/like`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLiked(true);
        } catch (err) {
            console.error('Like failed:', err);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!event) {
        return (
            <StudentLayout user={user}>
                <div className="text-center py-12 glass-card border border-white/10 max-w-lg mx-auto mt-10">
                    <h2 className="text-2xl font-bold text-white">Event not found</h2>
                    <button onClick={() => navigate('/events')} className="mt-4 text-indigo-400 hover:text-indigo-300 hover:underline">
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
                    className="flex items-center text-gray-400 hover:text-white mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5 mr-2" />
                    Back to Events
                </button>

                <div className="glass-card shadow-xl overflow-hidden border border-white/10">
                    {/* Hero Image */}
                    <div className="h-64 md:h-80 relative" style={{ background: 'linear-gradient(135deg, #4F46E5, #7C3AED)' }}>
                        <div className="absolute inset-0 bg-black bg-opacity-20"></div>
                        <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent">
                            <span className="px-3 py-1 text-xs font-bold text-indigo-100 bg-white/20 backdrop-blur-md rounded-lg mb-3 inline-block border border-white/30">
                                {event.category}
                            </span>
                            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{event.title}</h1>
                            <div className="flex items-center text-white/90 gap-4 text-sm md:text-base">
                                <span className="flex items-center"><Calendar className="w-4 h-4 mr-2" /> {new Date(event.date).toLocaleDateString()}</span>
                                <span className="flex items-center"><MapPin className="w-4 h-4 mr-2" /> {event.venue}</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-white/5">
                        {/* Main Content */}
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-xl font-bold text-white mb-4">About Event</h3>
                                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">
                                    {event.description}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-400">
                                            <Award className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-white">Points</span>
                                    </div>
                                    <p className="text-2xl font-bold text-indigo-400">{event.points} Credits</p>
                                </div>
                                <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-2 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <span className="font-semibold text-white">Organizer</span>
                                    </div>
                                    <p className="text-lg font-bold text-purple-400 truncate">{event.organizer || 'College'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar / Actions */}
                        <div className="space-y-6">
                            <div className="bg-white/5 p-6 border border-white/10 rounded-2xl">
                                <h3 className="font-bold text-white mb-4">Event Details</h3>
                                <ul className="space-y-4 text-sm">
                                    <li className="flex items-start">
                                        <Calendar className="w-5 h-5 text-indigo-400 mr-3 mt-0.5" />
                                        <div>
                                            <span className="block font-medium text-white">Date</span>
                                            <span className="text-gray-400">{new Date(event.date).toLocaleDateString()}</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <Clock className="w-5 h-5 text-indigo-400 mr-3 mt-0.5" />
                                        <div>
                                            <span className="block font-medium text-white">Time</span>
                                            <span className="text-gray-400">{new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </li>
                                    <li className="flex items-start">
                                        <MapPin className="w-5 h-5 text-indigo-400 mr-3 mt-0.5" />
                                        <div>
                                            <span className="block font-medium text-white">Venue</span>
                                            <span className="text-gray-400">{event.venue}</span>
                                        </div>
                                    </li>
                                </ul>

                                <hr className="my-6 border-white/10" />

                                {success && (
                                    <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg text-sm flex items-start">
                                        <CheckCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                        {success}
                                    </div>
                                )}

                                {error && (
                                    <div className="mb-4 p-3 bg-red-500/20 border border-red-500/30 text-red-300 rounded-lg text-sm flex items-start">
                                        <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                        {error}
                                    </div>
                                )}

                                {isEventOver ? (
                                    <button disabled className="w-full py-3 px-4 bg-white/5 border border-white/10 text-gray-500 font-bold rounded-xl cursor-not-allowed">
                                        Event Ended
                                    </button>
                                ) : isRegistrationClosed ? (
                                    <button disabled className="w-full py-3 px-4 bg-red-500/10 border border-red-500/20 text-red-400 font-bold rounded-xl cursor-not-allowed">
                                        Registration Closed
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleRegister}
                                        disabled={registering || success}
                                        className={`w-full py-3 px-4 font-bold rounded-xl text-white transition-all transform hover:scale-[1.02] ${success
                                            ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-300'
                                            : 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 border border-indigo-400/30 shadow-glow'
                                            }`}
                                    >
                                        {registering ? 'Registering...' : success ? 'Registered' : 'Register Now'}
                                    </button>
                                )}
                            </div>

                            <button className="w-full flex items-center justify-center py-3 px-4 border border-white/10 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white font-medium transition-colors">
                                <Share2 className="w-4 h-4 mr-2 text-indigo-400" />
                                Share Event
                            </button>

                            <button
                                onClick={handleLike}
                                disabled={liked}
                                className={`w-full flex items-center justify-center py-3 px-4 border rounded-xl font-medium transition-all group ${liked
                                    ? 'bg-red-500/10 border-red-500/30 text-red-400'
                                    : 'border-white/10 text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                            >
                                <motion.div animate={liked ? { scale: [1, 1.4, 1] } : {}}>
                                    <Tag className={`w-4 h-4 mr-2 ${liked ? 'fill-red-500 text-red-500' : 'text-red-400 group-hover:text-red-300'}`} />
                                </motion.div>
                                {liked ? 'Liked' : 'Like Event'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};

export default EventDetails;
