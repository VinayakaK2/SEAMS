import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import CoordinatorLayout from '../components/CoordinatorLayout';
import { Search, QrCode, Trash2, Eye, Edit2, X, Calendar, MapPin, Users, Award, User, Phone, Plus } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import API_URL from '../config/api';

const ManageEvents = () => {
    const { user } = useContext(AuthContext);
    const socket = useSocket();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQR, setSelectedQR] = useState(null);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [editCoordinators, setEditCoordinators] = useState([{ name: '', phone: '' }]);

    // Fetch events from API
    useEffect(() => {
        fetchEvents();
    }, []);

    // Socket listeners for real-time updates
    useEffect(() => {
        if (!socket) return;

        socket.on('event_updated', (updatedEvent) => {
            console.log('Event updated:', updatedEvent);
            setEvents(prev => prev.map(e => e._id === updatedEvent._id ? updatedEvent : e));
        });

        socket.on('event_deleted', (data) => {
            console.log('Event deleted:', data);
            setEvents(prev => prev.filter(e => e._id !== data._id));
        });

        return () => {
            socket.off('event_updated');
            socket.off('event_deleted');
        };
    }, [socket]);

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('token');
            // Use optimized aggregation endpoint
            const { data } = await axios.get('http://localhost:5000/api/events/coordinator/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });

            console.log('Fetched my events:', data);
            setEvents(data);
            setFilteredEvents(data);
        } catch (error) {
            console.error('Error fetching events:', error);
        }
    };

    useEffect(() => {
        let result = events;
        if (selectedCategory !== 'All') {
            result = result.filter(e => e.category === selectedCategory);
        }
        if (searchTerm) {
            result = result.filter(e => e.title.toLowerCase().includes(searchTerm.toLowerCase()));
        }
        setFilteredEvents(result);
    }, [searchTerm, selectedCategory, events]);

    const handleShowQR = async (event) => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.post(
                `${API_URL}/api/events/${event._id}/qr`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSelectedQR({ title: event.title, value: data.qrCode });
            setShowQRModal(true);
        } catch (error) {
            console.error('Error generating QR:', error);
            const qrData = `event:${event._id}`;
            setSelectedQR({ title: event.title, value: qrData });
            setShowQRModal(true);
        }
    };

    const handleViewEvent = (event) => {
        setSelectedEvent(event);
        setShowViewModal(true);
    };

    const handleEditEvent = (event) => {
        setSelectedEvent(event);
        setEditFormData({
            title: event.title || '',
            description: event.description || '',
            startDate: event.startDate || event.date || '',
            startTime: event.startTime || event.time || '',
            endDate: event.endDate || '',
            endTime: event.endTime || '',
            venue: event.venue || '',
            category: event.category || 'Technical',
            points: event.points || 0,
            maxParticipants: event.maxParticipants || 0,
        });
        setEditCoordinators(event.coordinators && event.coordinators.length > 0 ? event.coordinators : [{ name: '', phone: '' }]);
        setShowEditModal(true);
    };

    const handleEditChange = (e) => {
        setEditFormData({ ...editFormData, [e.target.name]: e.target.value });
    };

    const handleCoordinatorChange = (index, field, value) => {
        const newCoordinators = [...editCoordinators];
        newCoordinators[index][field] = value;
        setEditCoordinators(newCoordinators);
    };

    const addCoordinator = () => {
        setEditCoordinators([...editCoordinators, { name: '', phone: '' }]);
    };

    const removeCoordinator = (index) => {
        if (editCoordinators.length > 1) {
            setEditCoordinators(editCoordinators.filter((_, i) => i !== index));
        }
    };

    const handleUpdateEvent = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const updateData = {
                ...editFormData,
                date: editFormData.startDate,
                time: editFormData.startTime,
                coordinators: editCoordinators.filter(c => c.name || c.phone)
            };
            await axios.put(`${API_URL}/api/events/${selectedEvent._id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowEditModal(false);
            alert('Event updated successfully!');
            fetchEvents();
        } catch (error) {
            console.error('Error updating event:', error);
            alert('Failed to update event');
        }
    };

    const handleDeleteEvent = async (eventId) => {
        if (!confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API_URL}/api/events/${eventId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Event deleted successfully');
        } catch (error) {
            console.error('Error deleting event:', error);
            alert(error.response?.data?.message || 'Failed to delete event');
        }
    };

    return (
        <CoordinatorLayout user={user} title="Manage Events">
            {/* Filters */}
            <div className="glass-card rounded-3xl p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="input-dark pl-12 pr-4 py-3 w-full text-sm"
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="input-dark px-4 py-3 w-full md:w-48 text-sm appearance-none bg-[#1a2235]"
                        >
                            <option value="All" className="bg-[#1a2235]">All Categories</option>
                            <option value="Technical" className="bg-[#1a2235]">Technical</option>
                            <option value="Cultural" className="bg-[#1a2235]">Cultural</option>
                            <option value="Sports" className="bg-[#1a2235]">Sports</option>
                            <option value="NSS" className="bg-[#1a2235]">NSS</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Events Table */}
            <div className="glass-card rounded-3xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Event Name</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Category</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Date</th>
                                <th className="text-center py-4 px-6 text-sm font-semibold text-slate-300">Registered</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-slate-300">Status</th>
                                <th className="text-center py-4 px-6 text-sm font-semibold text-slate-300">View</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-slate-300">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredEvents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-slate-400">
                                        No events found
                                    </td>
                                </tr>
                            ) : (
                                filteredEvents.map((event) => (
                                    <tr key={event._id} className="hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-6 font-medium text-white">{event.title}</td>
                                        <td className="py-4 px-6 text-sm text-slate-400">{event.category}</td>
                                        <td className="py-4 px-6 text-sm text-slate-400 flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-indigo-400" />
                                            {new Date(event.date).toLocaleDateString()}
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                                                {event.registeredCount || 0}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${event.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                event.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                                    'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                                }`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleViewEvent(event)}
                                                className="p-2 text-slate-400 hover:bg-indigo-500/10 hover:text-indigo-400 rounded-xl transition-colors inline-flex items-center justify-center border border-transparent hover:border-indigo-500/30"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditEvent(event)}
                                                    className="p-2 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-400 rounded-xl transition-colors border border-transparent hover:border-emerald-500/30"
                                                    title="Edit Event"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleShowQR(event)}
                                                    className="p-2 text-slate-400 hover:bg-purple-500/10 hover:text-purple-400 rounded-xl transition-colors border border-transparent hover:border-purple-500/30"
                                                    title="Generate QR Code"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEvent(event._id)}
                                                    className="p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 rounded-xl transition-colors border border-transparent hover:border-rose-500/30"
                                                    title="Delete Event"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* View Modal */}
            {showViewModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all" onClick={() => setShowViewModal(false)}>
                    <div className="glass-card rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-bold text-white">{selectedEvent.title}</h3>
                            <button onClick={() => setShowViewModal(false)} className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                                <p className="text-slate-300 mt-2 leading-relaxed">{selectedEvent.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6 bg-white/5 p-4 rounded-2xl border border-white/10">
                                <div>
                                    <label className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-1">
                                        <Calendar className="w-4 h-4 text-indigo-400" /> Date
                                    </label>
                                    <p className="text-white font-medium">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-1">
                                         <Calendar className="w-4 h-4 text-indigo-400 opacity-0" /> Time
                                    </label>
                                    <p className="text-white font-medium">{selectedEvent.time || selectedEvent.startTime || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="bg-white/5 p-4 rounded-2xl border border-white/10">
                                <label className="text-sm font-semibold text-slate-400 flex items-center gap-2 mb-1">
                                    <MapPin className="w-4 h-4 text-rose-400" /> Venue
                                </label>
                                <p className="text-white font-medium">{selectedEvent.venue}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Category</label>
                                    <p className="text-white mt-1 font-medium">{selectedEvent.category}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Award className="w-4 h-4 text-amber-400" /> Points
                                    </label>
                                    <p className="text-amber-400 mt-1 font-bold text-lg">{selectedEvent.points}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="text-sm font-semibold text-slate-400 flex items-center gap-2 uppercase tracking-wider">
                                        <Users className="w-4 h-4 text-indigo-400" /> Max Participants
                                    </label>
                                    <p className="text-white mt-1 font-medium">{selectedEvent.maxParticipants || 'Unlimited'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Registered</label>
                                    <p className="text-indigo-400 mt-1 font-bold text-lg">{selectedEvent.registeredCount || 0}</p>
                                </div>
                            </div>

                            {selectedEvent.coordinators && selectedEvent.coordinators.length > 0 && (
                                <div>
                                    <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 block">Event Coordinators</label>
                                    <div className="space-y-3">
                                        {selectedEvent.coordinators.map((coord, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
                                                <User className="w-5 h-5 text-indigo-400" />
                                                <span className="text-white font-medium">{coord.name}</span>
                                                {coord.phone && (
                                                    <>
                                                        <span className="text-slate-600">|</span>
                                                        <Phone className="w-4 h-4 text-indigo-400" />
                                                        <span className="text-slate-300">{coord.phone}</span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
                                <p className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${selectedEvent.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    selectedEvent.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                        'bg-slate-500/10 text-slate-400 border-slate-500/20'
                                    }`}>
                                    {selectedEvent.status}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowViewModal(false)}
                            className="w-full mt-8 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors border border-white/10"
                        >
                            Close Details
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedEvent && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="glass-card rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-8">
                            <div>
                              <h3 className="text-2xl font-bold text-white mb-1">Edit Event</h3>
                              <p className="text-slate-400 text-sm">Update the details for {selectedEvent.title}</p>
                            </div>
                            <button onClick={() => setShowEditModal(false)} className="p-2 text-slate-400 hover:bg-white/10 hover:text-white rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateEvent} className="space-y-6">
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-slate-300">Event Title *</label>
                                <input
                                    name="title"
                                    value={editFormData.title}
                                    onChange={handleEditChange}
                                    className="input-dark w-full"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-semibold text-slate-300">Description *</label>
                                <textarea
                                    name="description"
                                    value={editFormData.description}
                                    onChange={handleEditChange}
                                    rows="4"
                                    className="input-dark w-full resize-none"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-slate-300">Start Date *</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={editFormData.startDate}
                                        onChange={handleEditChange}
                                        className="input-dark w-full"
                                        required
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-slate-300">Start Time *</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={editFormData.startTime}
                                        onChange={handleEditChange}
                                        className="input-dark w-full"
                                        required
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-slate-300">End Date</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={editFormData.endDate}
                                        onChange={handleEditChange}
                                        className="input-dark w-full"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-slate-300">End Time</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={editFormData.endTime}
                                        onChange={handleEditChange}
                                        className="input-dark w-full"
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-semibold text-slate-300">Venue *</label>
                                <input
                                    name="venue"
                                    value={editFormData.venue}
                                    onChange={handleEditChange}
                                    className="input-dark w-full"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-slate-300">Category *</label>
                                    <select
                                        name="category"
                                        value={editFormData.category}
                                        onChange={handleEditChange}
                                        className="input-dark w-full appearance-none pr-10"
                                    >
                                        <option value="Technical" className="bg-[#1a2235]">Technical</option>
                                        <option value="Cultural" className="bg-[#1a2235]">Cultural</option>
                                        <option value="Sports" className="bg-[#1a2235]">Sports</option>
                                        <option value="NSS" className="bg-[#1a2235]">NSS</option>
                                        <option value="Entrepreneurship" className="bg-[#1a2235]">Entrepreneurship</option>
                                        <option value="Placement" className="bg-[#1a2235]">Placement</option>
                                        <option value="Life Skills" className="bg-[#1a2235]">Life Skills</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-slate-300">Points *</label>
                                    <input
                                        type="number"
                                        name="points"
                                        value={editFormData.points}
                                        onChange={handleEditChange}
                                        className="input-dark w-full"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-slate-300">Max Participants</label>
                                    <input
                                        type="number"
                                        name="maxParticipants"
                                        value={editFormData.maxParticipants}
                                        onChange={handleEditChange}
                                        className="input-dark w-full"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Event Coordinators */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-semibold text-slate-300">Event Coordinators</label>
                                    <button
                                        type="button"
                                        onClick={addCoordinator}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-500/30"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {editCoordinators.map((coordinator, index) => (
                                        <div key={index} className="flex gap-3 items-start p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={coordinator.name}
                                                    onChange={(e) => handleCoordinatorChange(index, 'name', e.target.value)}
                                                    className="input-dark w-full py-2 text-sm"
                                                    placeholder="Name"
                                                />
                                                <input
                                                    type="tel"
                                                    value={coordinator.phone}
                                                    onChange={(e) => handleCoordinatorChange(index, 'phone', e.target.value)}
                                                    className="input-dark w-full py-2 text-sm"
                                                    placeholder="Phone"
                                                />
                                            </div>
                                            {editCoordinators.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCoordinator(index)}
                                                    className="mt-1 p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/30"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4 border-t border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="flex-1 px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors border border-white/10"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 btn-primary"
                                >
                                    Update Event
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {showQRModal && selectedQR && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-all" onClick={() => setShowQRModal(false)}>
                    <div className="glass-card rounded-3xl p-8 max-w-sm w-full text-center relative overflow-hidden group shadow-2xl border border-white/10" onClick={e => e.stopPropagation()}>
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50"></div>
                        <h3 className="text-xl font-bold text-white mb-2 relative z-10">{selectedQR.title}</h3>
                        <p className="text-slate-400 text-sm mb-6 relative z-10">Scan to mark attendance</p>
                        <div className="bg-white p-4 rounded-xl inline-block mb-8 relative z-10 shadow-lg ring-4 ring-white/5">
                            <QRCodeSVG value={selectedQR.value} size={200} level="H" includeMargin={true} />
                        </div>
                        <button
                            onClick={() => setShowQRModal(false)}
                            className="w-full py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold transition-colors border border-white/10 relative z-10"
                        >
                            Close QR Code
                        </button>
                    </div>
                </div>
            )}
        </CoordinatorLayout>
    );
};

export default ManageEvents;
