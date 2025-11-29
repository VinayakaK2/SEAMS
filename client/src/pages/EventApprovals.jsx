import { useState, useContext, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import {
    CheckSquare, XCircle, Eye, Calendar, MapPin, User, Tag,
    Clock, CheckCircle, AlertTriangle
} from 'lucide-react';

const EventApprovals = () => {
    const { user } = useContext(AuthContext);
    const socket = useSocket();
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [pendingEvents, setPendingEvents] = useState([]);

    useEffect(() => {
        fetchPendingEvents();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('event_created', (newEvent) => {
            console.log('New event created:', newEvent);
            if (newEvent.status === 'pending') {
                setPendingEvents(prev => [newEvent, ...prev]);
            }
        });

        socket.on('event_status_updated', (updatedEvent) => {
            console.log('Event status updated:', updatedEvent);
            setPendingEvents(prev => prev.filter(e => e._id !== updatedEvent._id));
        });

        return () => {
            socket.off('event_created');
            socket.off('event_status_updated');
        };
    }, [socket]);

    const fetchPendingEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get('http://localhost:5000/api/events?status=pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingEvents(data);
        } catch (error) {
            console.error('Error fetching pending events:', error);
        }
    };

    const handleViewDetails = (event) => {
        setSelectedEvent(event);
        setIsDrawerOpen(true);
    };

    const handleApprove = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/events/${id}/status`,
                { status: 'approved' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPendingEvents(pendingEvents.filter(e => e._id !== id));
            setIsDrawerOpen(false);
        } catch (error) {
            console.error('Error approving event:', error);
            alert('Failed to approve event');
        }
    };

    const handleReject = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:5000/api/events/${id}/status`,
                { status: 'rejected' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setPendingEvents(pendingEvents.filter(e => e._id !== id));
            setIsDrawerOpen(false);
        } catch (error) {
            console.error('Error rejecting event:', error);
            alert('Failed to reject event');
        }
    };

    return (
        <AdminLayout user={user} title="Event Approvals">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Pending Approvals</h2>
                <p className="text-gray-500">Review and approve event requests from coordinators.</p>
            </div>

            {pendingEvents.length === 0 ? (
                <div className="bg-white p-12 rounded-3xl shadow-sm border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">All Caught Up!</h3>
                    <p className="text-gray-500 mt-2">There are no pending event approvals at the moment.</p>
                </div>
            ) : (
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Event Name</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Created By</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Category</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingEvents.map((event) => (
                                <tr key={event._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-gray-900">{event.title}</td>
                                    <td className="py-4 px-6 text-sm text-gray-600">{event.organizer?.name || 'Unknown'}</td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                                            {event.category}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-gray-600">{new Date(event.date).toLocaleDateString()}</td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-100">
                                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleViewDetails(event)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleApprove(event._id)}
                                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                title="Approve"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleReject(event._id)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="Reject"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Event Details Drawer */}
            {isDrawerOpen && selectedEvent && (
                <>
                    <div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-bold text-gray-900">Event Details</h3>
                                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-gray-100 rounded-full">
                                    <XCircle className="w-6 h-6 text-gray-400" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="aspect-video bg-gray-100 rounded-xl overflow-hidden">
                                    <img src={selectedEvent.poster || 'https://via.placeholder.com/300x400'} alt="Event Poster" className="w-full h-full object-cover" />
                                </div>

                                <div>
                                    <span className="inline-block px-3 py-1 bg-blue-50 text-blue-700 text-xs font-bold rounded-full mb-2">
                                        {selectedEvent.category}
                                    </span>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedEvent.title}</h2>
                                    <p className="text-gray-600 text-sm leading-relaxed">{selectedEvent.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <Calendar className="w-3 h-3" /> Date
                                        </div>
                                        <p className="font-semibold text-gray-900">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <Clock className="w-3 h-3" /> Time
                                        </div>
                                        <p className="font-semibold text-gray-900">{selectedEvent.time}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <MapPin className="w-3 h-3" /> Venue
                                        </div>
                                        <p className="font-semibold text-gray-900">{selectedEvent.venue}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 rounded-xl">
                                        <div className="flex items-center gap-2 text-gray-500 text-xs mb-1">
                                            <Tag className="w-3 h-3" /> Points
                                        </div>
                                        <p className="font-semibold text-gray-900">{selectedEvent.points}</p>
                                    </div>
                                </div>

                                <div className="p-4 border border-gray-100 rounded-xl flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                                        <User className="w-5 h-5 text-gray-500" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-500">Organized by</p>
                                        <p className="font-semibold text-gray-900">{selectedEvent.organizer?.name || 'Unknown'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-100">
                                    <button
                                        onClick={() => handleReject(selectedEvent._id)}
                                        className="flex-1 py-3 border border-red-200 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-colors"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedEvent._id)}
                                        className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-200"
                                    >
                                        Approve Event
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </AdminLayout>
    );
};

export default EventApprovals;
