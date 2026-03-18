import { useState, useContext, useEffect } from 'react';
import CoordinatorLayout from '../components/CoordinatorLayout';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { Users, ChevronDown, ChevronUp, Mail, Award, Calendar } from 'lucide-react';
import API_URL from '../config/api';

const ManageParticipants = () => {
    const { user } = useContext(AuthContext);
    const socket = useSocket();
    const [eventsWithParticipants, setEventsWithParticipants] = useState([]);
    const [expandedEvents, setExpandedEvents] = useState({});

    useEffect(() => {
        fetchMyEventsWithParticipants();
    }, []);

    useEffect(() => {
        if (!socket) return;

        // Listen for new registrations
        socket.on('registration_created', (data) => {
            console.log('New registration:', data);
            updateEventParticipantCount(data.event._id, data.participantCount);
        });

        return () => {
            socket.off('registration_created');
        };
    }, [socket]);

    const fetchMyEventsWithParticipants = async () => {
        try {
            const token = localStorage.getItem('token');
            // Fetch events and participants in a single optimized call (O(1))
            const { data } = await axios.get('http://localhost:5000/api/events/coordinator/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEventsWithParticipants(data);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    const updateEventParticipantCount = (eventId, newCount) => {
        setEventsWithParticipants(prev =>
            prev.map(event =>
                event._id === eventId
                    ? { ...event, registeredCount: newCount }
                    : event
            )
        );
        // Refresh to get new participant details
        fetchMyEventsWithParticipants();
    };

    const toggleEventExpansion = (eventId) => {
        setExpandedEvents(prev => ({
            ...prev,
            [eventId]: !prev[eventId]
        }));
    };

    return (
        <CoordinatorLayout user={user} title="Manage Participants">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-white">Event Participants</h2>
                <p className="text-gray-400">View and manage students registered for your events.</p>
            </div>

            {eventsWithParticipants.length === 0 ? (
                <div className="glass-card p-12 border border-white/10 text-center">
                    <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white">No Events Yet</h3>
                    <p className="text-gray-400 mt-2">Create an event to start managing participants.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {eventsWithParticipants.map((event) => {
                        const isExpanded = expandedEvents[event._id];
                        const visibleParticipants = isExpanded
                            ? event.participants
                            : event.participants.slice(0, 5);
                        const hasMore = event.participants.length > 5;

                        return (
                            <div key={event._id} className="glass-card overflow-hidden">
                                {/* Event Header */}
                                <div className="p-6 border-b border-white/5 bg-white/5">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{event.title}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(event.date).toLocaleDateString()}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Users className="w-4 h-4" />
                                                    {event.participants.length} Registered
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Award className="w-4 h-4" />
                                                    {event.points} Points
                                                </span>
                                            </div>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold border ${event.status === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                            event.status === 'pending' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' :
                                                'bg-white/10 text-gray-300 border-white/10'
                                            }`}>
                                            {event.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Participants List */}
                                {event.participants.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-2 text-white/20" />
                                        <p>No participants yet</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="divide-y divide-white/5">
                                            {visibleParticipants.map((participant, index) => (
                                                <div key={participant._id} className="p-4 hover:bg-white/5 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-500/20 border border-indigo-500/30 rounded-full flex items-center justify-center text-indigo-300 font-bold">
                                                                {participant.student?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white">
                                                                    {participant.student?.name || 'Unknown'}
                                                                </p>
                                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                                    <Mail className="w-3 h-3" />
                                                                    {participant.student?.email || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium border ${participant.status === 'verified' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' :
                                                                participant.status === 'attended' ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' :
                                                                    'bg-white/10 text-gray-300 border-white/10'
                                                                }`}>
                                                                {participant.status}
                                                            </span>
                                                            {participant.student?.usn && (
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    USN: {participant.student.usn}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Show More Button */}
                                        {hasMore && (
                                            <div className="p-4 border-t border-white/5 bg-white/5">
                                                <button
                                                    onClick={() => toggleEventExpansion(event._id)}
                                                    className="w-full flex items-center justify-center gap-2 py-2 text-indigo-400 font-medium hover:text-indigo-300 transition-colors"
                                                >
                                                    {isExpanded ? (
                                                        <>
                                                            <ChevronUp className="w-4 h-4" />
                                                            Show Less
                                                        </>
                                                    ) : (
                                                        <>
                                                            <ChevronDown className="w-4 h-4" />
                                                            Show More ({event.participants.length - 5} more)
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </CoordinatorLayout>
    );
};

export default ManageParticipants;
