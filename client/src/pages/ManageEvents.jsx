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
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search events..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="All">All Categories</option>
                            <option value="Technical">Technical</option>
                            <option value="Cultural">Cultural</option>
                            <option value="Sports">Sports</option>
                            <option value="NSS">NSS</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Events Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Event Name</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Category</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Date</th>
                                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">Registered</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">View</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEvents.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-12 text-center text-gray-500">
                                        No events found
                                    </td>
                                </tr>
                            ) : (
                                filteredEvents.map((event) => (
                                    <tr key={event._id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6 font-medium text-gray-900">{event.title}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{event.category}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{new Date(event.date).toLocaleDateString()}</td>
                                        <td className="py-4 px-6 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                {event.registeredCount || 0}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${event.status === 'approved' ? 'bg-green-50 text-green-700 border border-green-100' :
                                                event.status === 'pending' ? 'bg-yellow-50 text-yellow-700 border border-yellow-100' :
                                                    'bg-gray-50 text-gray-700 border border-gray-100'
                                                }`}>
                                                {event.status}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-center">
                                            <button
                                                onClick={() => handleViewEvent(event)}
                                                className="p-2 text-gray-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors inline-flex items-center gap-1"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEditEvent(event)}
                                                    className="p-2 text-gray-500 hover:bg-green-50 hover:text-green-600 rounded-lg transition-colors"
                                                    title="Edit Event"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleShowQR(event)}
                                                    className="p-2 text-gray-500 hover:bg-purple-50 hover:text-purple-600 rounded-lg transition-colors"
                                                    title="Generate QR Code"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteEvent(event._id)}
                                                    className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
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
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowViewModal(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">{selectedEvent.title}</h3>
                            <button onClick={() => setShowViewModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-500">Description</label>
                                <p className="text-gray-900 mt-1">{selectedEvent.description}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                                        <Calendar className="w-4 h-4" /> Date
                                    </label>
                                    <p className="text-gray-900 mt-1">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-500">Time</label>
                                    <p className="text-gray-900 mt-1">{selectedEvent.time || selectedEvent.startTime || 'N/A'}</p>
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                                    <MapPin className="w-4 h-4" /> Venue
                                </label>
                                <p className="text-gray-900 mt-1">{selectedEvent.venue}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-500">Category</label>
                                    <p className="text-gray-900 mt-1">{selectedEvent.category}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                                        <Award className="w-4 h-4" /> Points
                                    </label>
                                    <p className="text-gray-900 mt-1">{selectedEvent.points}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-500 flex items-center gap-1">
                                        <Users className="w-4 h-4" /> Max Participants
                                    </label>
                                    <p className="text-gray-900 mt-1">{selectedEvent.maxParticipants || 'Unlimited'}</p>
                                </div>
                                <div>
                                    <label className="text-sm font-semibold text-gray-500">Registered</label>
                                    <p className="text-gray-900 mt-1">{selectedEvent.registeredCount || 0}</p>
                                </div>
                            </div>

                            {selectedEvent.coordinators && selectedEvent.coordinators.length > 0 && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-500 mb-2 block">Event Coordinators</label>
                                    <div className="space-y-2">
                                        {selectedEvent.coordinators.map((coord, idx) => (
                                            <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                                                <User className="w-4 h-4 text-gray-400" />
                                                <span className="text-gray-900">{coord.name}</span>
                                                {coord.phone && (
                                                    <>
                                                        <span className="text-gray-300">|</span>
                                                        <Phone className="w-4 h-4 text-gray-400" />
                                                        <span className="text-gray-600">{coord.phone}</span>
                                                    </>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-semibold text-gray-500">Status</label>
                                <p className={`mt-1 inline-block px-3 py-1 rounded-full text-sm font-medium ${selectedEvent.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    selectedEvent.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-gray-100 text-gray-700'
                                    }`}>
                                    {selectedEvent.status}
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => setShowViewModal(false)}
                            className="w-full mt-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && selectedEvent && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-2xl font-bold text-gray-900">Edit Event</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateEvent} className="space-y-6">
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-gray-700">Event Title *</label>
                                <input
                                    name="title"
                                    value={editFormData.title}
                                    onChange={handleEditChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-semibold text-gray-700">Description *</label>
                                <textarea
                                    name="description"
                                    value={editFormData.description}
                                    onChange={handleEditChange}
                                    rows="4"
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Start Date *</label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={editFormData.startDate}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Start Time *</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={editFormData.startTime}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">End Date</label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={editFormData.endDate}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">End Time</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={editFormData.endTime}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-semibold text-gray-700">Venue *</label>
                                <input
                                    name="venue"
                                    value={editFormData.venue}
                                    onChange={handleEditChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Category *</label>
                                    <select
                                        name="category"
                                        value={editFormData.category}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                    >
                                        <option value="Technical">Technical</option>
                                        <option value="Cultural">Cultural</option>
                                        <option value="Sports">Sports</option>
                                        <option value="NSS">NSS</option>
                                        <option value="Entrepreneurship">Entrepreneurship</option>
                                        <option value="Placement">Placement</option>
                                        <option value="Life Skills">Life Skills</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Points *</label>
                                    <input
                                        type="number"
                                        name="points"
                                        value={editFormData.points}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-semibold text-gray-700">Max Participants</label>
                                    <input
                                        type="number"
                                        name="maxParticipants"
                                        value={editFormData.maxParticipants}
                                        onChange={handleEditChange}
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        min="0"
                                    />
                                </div>
                            </div>

                            {/* Event Coordinators */}
                            <div>
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-sm font-semibold text-gray-700">Event Coordinators</label>
                                    <button
                                        type="button"
                                        onClick={addCoordinator}
                                        className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Add
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {editCoordinators.map((coordinator, index) => (
                                        <div key={index} className="flex gap-3 items-start p-4 bg-gray-50 rounded-xl">
                                            <div className="flex-1 grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={coordinator.name}
                                                    onChange={(e) => handleCoordinatorChange(index, 'name', e.target.value)}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    placeholder="Name"
                                                />
                                                <input
                                                    type="tel"
                                                    value={coordinator.phone}
                                                    onChange={(e) => handleCoordinatorChange(index, 'phone', e.target.value)}
                                                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                                    placeholder="Phone"
                                                />
                                            </div>
                                            {editCoordinators.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => removeCoordinator(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
                                >
                                    Update Event
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Modal */}
            {showQRModal && selectedQR && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedQR.title}</h3>
                        <p className="text-gray-500 text-sm mb-6">Scan to mark attendance</p>
                        <div className="bg-white p-4 border border-gray-100 rounded-xl inline-block mb-6">
                            <QRCodeSVG value={selectedQR.value} size={200} level="H" />
                        </div>
                        <button
                            onClick={() => setShowQRModal(false)}
                            className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </CoordinatorLayout>
    );
};

export default ManageEvents;
