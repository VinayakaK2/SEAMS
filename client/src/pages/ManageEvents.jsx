import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import CoordinatorLayout from '../components/CoordinatorLayout';
import { Search, Filter, Eye, QrCode, Settings, Calendar } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const ManageEvents = () => {
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showQRModal, setShowQRModal] = useState(false);
    const [selectedQR, setSelectedQR] = useState(null);

    // Mock Data
    useEffect(() => {
        const mockEvents = [
            { id: 1, title: 'Tech Workshop', category: 'Technical', date: '2024-01-15', registered: 45, attendance: 38, status: 'Upcoming' },
            { id: 2, title: 'Cultural Fest', category: 'Cultural', date: '2024-01-20', registered: 120, attendance: 0, status: 'Upcoming' },
            { id: 3, title: 'Sports Day', category: 'Sports', date: '2024-01-25', registered: 80, attendance: 75, status: 'Completed' },
            { id: 4, title: 'NSS Camp', category: 'NSS', date: '2024-02-01', registered: 30, attendance: 0, status: 'Upcoming' },
        ];
        setEvents(mockEvents);
        setFilteredEvents(mockEvents);
    }, []);

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

    const handleShowQR = (event) => {
        const qrData = JSON.stringify({
            eventTitle: event.title,
            timestamp: Date.now(),
            id: event.id
        });
        setSelectedQR({ title: event.title, value: qrData });
        setShowQRModal(true);
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
                                <th className="text-center py-4 px-6 text-sm font-semibold text-gray-700">Attendance</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEvents.map((event) => (
                                <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="py-4 px-6 font-medium text-gray-900">{event.title}</td>
                                    <td className="py-4 px-6 text-sm text-gray-600">{event.category}</td>
                                    <td className="py-4 px-6 text-sm text-gray-600">{event.date}</td>
                                    <td className="py-4 px-6 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {event.registered}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-center text-sm text-gray-600">{event.attendance}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${event.status === 'Upcoming' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                                'bg-green-50 text-green-700 border border-green-100'
                                            }`}>
                                            {event.status}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => handleShowQR(event)}
                                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                                title="Show QR"
                                            >
                                                <QrCode className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="View Participants">
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors" title="Manage">
                                                <Settings className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* QR Modal */}
            {showQRModal && selectedQR && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={() => setShowQRModal(false)}>
                    <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{selectedQR.title}</h3>
                        <p className="text-gray-500 text-sm mb-6">Scan to register</p>
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
