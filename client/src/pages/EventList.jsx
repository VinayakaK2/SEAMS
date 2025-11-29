import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import { Calendar, MapPin, User, Tag, Clock, ArrowRight, Filter } from 'lucide-react';

const EventList = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const categories = [
        'All',
        'Technical',
        'Cultural',
        'Sports',
        'NSS',
        'Entrepreneurship',
        'Placement',
        'Life Skills'
    ];

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/events');
                setEvents(data);
            } catch (error) {
                console.error('Error fetching events:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchEvents();
    }, []);

    const getStatusChip = (date, status) => {
        const eventDate = new Date(date);
        const now = new Date();

        if (eventDate < now) {
            return <span className="px-3 py-1 text-xs font-semibold text-gray-600 bg-gray-100 rounded-full">Over</span>;
        }
        if (status === 'closed') {
            return <span className="px-3 py-1 text-xs font-semibold text-red-600 bg-red-100 rounded-full">Closed</span>;
        }
        return <span className="px-3 py-1 text-xs font-semibold text-green-600 bg-green-100 rounded-full">Open</span>;
    };

    const filteredEvents = events.filter(event => {
        const matchesCategory = filter === 'All' || event.category === filter;
        const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            event.description.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    if (!user) return null; // Should be handled by protected route

    return (
        <StudentLayout user={user} title="Explore Events">
            {/* Filters and Search */}
            <div className="mb-8 space-y-4">
                {/* Search Bar */}
                <div className="relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search events..."
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Filter className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                </div>

                {/* Category Chips */}
                <div className="flex flex-wrap gap-2">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilter(cat)}
                            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${filter === cat
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Events Grid */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            ) : filteredEvents.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">No events found</h3>
                    <p className="text-gray-500">Try adjusting your filters or search terms.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEvents.map((event) => (
                        <div key={event._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                            {/* Event Image Placeholder */}
                            <div className="h-48 bg-gradient-to-br from-blue-500 to-indigo-600 relative">
                                <div className="absolute top-4 right-4">
                                    {getStatusChip(event.date, event.status)}
                                </div>
                                <div className="absolute bottom-4 left-4">
                                    <span className="px-3 py-1 text-xs font-bold text-white bg-black bg-opacity-30 rounded-lg backdrop-blur-sm">
                                        {event.category}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-2">{event.title}</h3>
                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{event.description}</p>

                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Calendar className="w-4 h-4 mr-2 text-blue-500" />
                                        {new Date(event.date).toLocaleDateString()}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <Clock className="w-4 h-4 mr-2 text-blue-500" />
                                        {new Date(event.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                    <div className="flex items-center text-sm text-gray-600">
                                        <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                                        {event.venue || 'TBD'}
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-100 flex items-center justify-between">
                                    <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">
                                        {event.points} Points
                                    </span>
                                    <button
                                        onClick={() => navigate(`/events/${event._id}`)}
                                        className="flex items-center text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors"
                                    >
                                        View Details
                                        <ArrowRight className="w-4 h-4 ml-1" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </StudentLayout>
    );
};

export default EventList;
