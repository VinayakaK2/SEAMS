import { useState, useContext, useEffect } from 'react';
import CoordinatorLayout from '../components/CoordinatorLayout';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import { Users, ChevronDown, ChevronUp, Mail, Award, Calendar } from 'lucide-react';

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
                <h2 className="text-2xl font-bold text-gray-900">Event Participants</h2>
                <p className="text-gray-500">View and manage students registered for your events.</p>
            </div>

            {eventsWithParticipants.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">No Events Yet</h3>
                    <p className="text-gray-500 mt-2">Create an event to start managing participants.</p>
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
                            <div key={event._id} className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                                {/* Event Header */}
                                <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-gray-900">{event.title}</h3>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
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
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${event.status === 'approved' ? 'bg-green-100 text-green-700' :
                                            event.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                'bg-gray-100 text-gray-700'
                                            }`}>
                                            {event.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Participants List */}
                                {event.participants.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">
                                        <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                        <p>No participants yet</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="divide-y divide-gray-100">
                                            {visibleParticipants.map((participant, index) => (
                                                <div key={participant._id} className="p-4 hover:bg-gray-50 transition-colors">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                                                                {participant.student?.name?.charAt(0) || '?'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">
                                                                    {participant.student?.name || 'Unknown'}
                                                                </p>
                                                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                                                    <Mail className="w-3 h-3" />
                                                                    {participant.student?.email || 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${participant.status === 'verified' ? 'bg-green-100 text-green-700' :
                                                                participant.status === 'attended' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-gray-100 text-gray-700'
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
                                            <div className="p-4 border-t border-gray-100 bg-gray-50">
                                                <button
                                                    onClick={() => toggleEventExpansion(event._id)}
                                                    className="w-full flex items-center justify-center gap-2 py-2 text-blue-600 font-medium hover:text-blue-700 transition-colors"
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
