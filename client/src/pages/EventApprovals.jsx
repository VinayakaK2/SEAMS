import { useState, useContext, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';
import {
    CheckSquare, XCircle, Eye, Calendar, MapPin, User, Tag,
    Clock, CheckCircle, AlertTriangle, ShieldCheck
} from 'lucide-react';
import API_URL from '../config/api';

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
            const { data } = await axios.get(`${API_URL}/api/events?status=pending`, {
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
            await axios.put(`${API_URL}/api/events/${id}/status`,
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
            await axios.put(`${API_URL}/api/events/${id}/status`,
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
                <h2 className="text-2xl font-bold text-white hidden lg:block">Pending Approvals</h2>
                <p className="text-slate-400">Review and approve event requests from coordinators.</p>
            </div>

            {pendingEvents.length === 0 ? (
                <div className="glass-card p-12 rounded-3xl text-center">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/10 border border-emerald-500/20">
                        <ShieldCheck className="w-10 h-10 text-emerald-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">All Caught Up!</h3>
                    <p className="text-slate-400">There are no pending event approvals at the moment. Great job!</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-300">Event Name</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-300">Created By</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-300">Category</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-300">Date</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-300">Status</th>
                                    <th className="py-4 px-6 text-sm font-semibold text-slate-300 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {pendingEvents.map((event) => (
                                    <tr key={event._id} className="hover:bg-white/5 transition-colors group">
                                        <td className="py-4 px-6 font-bold text-white group-hover:text-amber-400 transition-colors">{event.title}</td>
                                        <td className="py-4 px-6 text-sm text-slate-400 flex items-center gap-2 mt-0.5">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 text-xs font-bold">
                                                {event.organizer?.name?.charAt(0) || 'U'}
                                            </div>
                                            {event.organizer?.name || 'Unknown'}
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                                {event.category}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-slate-300">{new Date(event.date).toLocaleDateString()}</td>
                                        <td className="py-4 px-6">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => handleViewDetails(event)}
                                                    className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                                    title="View Details"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleApprove(event._id)}
                                                    className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                                    title="Approve"
                                                >
                                                    <CheckCircle className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(event._id)}
                                                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                                    title="Reject"
                                                >
                                                    <XCircle className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Event Details Drawer */}
            {isDrawerOpen && selectedEvent && (
                <>
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity"
                        onClick={() => setIsDrawerOpen(false)}
                    />
                    <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0B0F1A] border-l border-white/10 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-6">
                                <h3 className="text-xl font-bold text-white">Event Details</h3>
                                <button onClick={() => setIsDrawerOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                    <XCircle className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="aspect-video bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative group">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0B0F1A] to-transparent opacity-60 z-10"></div>
                                    <img src={selectedEvent.poster || 'https://via.placeholder.com/300x400'} alt="Event Poster" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute bottom-4 left-4 z-20">
                                         <span className="inline-block px-3 py-1 bg-indigo-500/80 backdrop-blur-md text-white text-xs font-bold rounded-full border border-indigo-400/50">
                                            {selectedEvent.category}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-3 leading-tight">{selectedEvent.title}</h2>
                                    <p className="text-slate-400 text-sm leading-relaxed">{selectedEvent.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 uppercase tracking-wider font-semibold">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Date
                                        </div>
                                        <p className="font-bold text-white tracking-wide">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 uppercase tracking-wider font-semibold">
                                            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Time
                                        </div>
                                        <p className="font-bold text-white tracking-wide">{selectedEvent.time}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 uppercase tracking-wider font-semibold">
                                            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Venue
                                        </div>
                                        <p className="font-bold text-white tracking-wide">{selectedEvent.venue}</p>
                                    </div>
                                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-colors">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2 uppercase tracking-wider font-semibold">
                                            <Tag className="w-3.5 h-3.5 text-amber-400" /> Points
                                        </div>
                                        <p className="font-bold text-amber-400 tracking-wide text-lg">{selectedEvent.points}</p>
                                    </div>
                                </div>

                                <div className="p-4 border border-white/10 bg-white/5 rounded-2xl flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <User className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">Organized by</p>
                                        <p className="font-bold text-white">{selectedEvent.organizer?.name || 'Unknown'}</p>
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-6 mt-6 border-t border-white/10">
                                    <button
                                        onClick={() => handleReject(selectedEvent._id)}
                                        className="flex-1 py-3.5 px-4 bg-white/5 border border-rose-500/30 text-rose-400 font-bold rounded-xl hover:bg-rose-500/10 hover:border-rose-500/50 transition-all flex items-center justify-center gap-2"
                                    >
                                        <XCircle className="w-5 h-5" /> Reject
                                    </button>
                                    <button
                                        onClick={() => handleApprove(selectedEvent._id)}
                                        className="flex-1 py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-emerald-600 border border-emerald-400/50 text-white font-bold rounded-xl hover:from-emerald-400 hover:to-emerald-500 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle className="w-5 h-5" /> Approve Event
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
