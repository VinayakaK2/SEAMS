import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import CoordinatorLayout from '../components/CoordinatorLayout';
import { Search, Filter, CheckCircle, XCircle, Clock, Download, CheckSquare, XSquare } from 'lucide-react';

const ManageParticipants = ({ embedded = false }) => {
    const { user } = useContext(AuthContext);
    const [participants, setParticipants] = useState([]);
    const [filteredParticipants, setFilteredParticipants] = useState([]);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    // Mock data for demonstration
    useEffect(() => {
        const mockParticipants = [
            { id: 1, studentName: 'John Doe', usn: '1MS21CS001', event: 'Tech Workshop', registeredAt: '2024-01-15 10:30 AM', scanTime: '-', status: 'pending', remarks: '' },
            { id: 2, studentName: 'Jane Smith', usn: '1MS21CS002', event: 'Cultural Fest', registeredAt: '2024-01-16 02:15 PM', scanTime: '-', status: 'pending', remarks: '' },
            { id: 3, studentName: 'Mike Johnson', usn: '1MS21CS003', event: 'Sports Day', registeredAt: '2024-01-17 09:45 AM', scanTime: '2024-01-25 09:00 AM', status: 'verified', remarks: 'Good performance' },
            { id: 4, studentName: 'Sarah Williams', usn: '1MS21CS004', event: 'Tech Workshop', registeredAt: '2024-01-18 11:20 AM', scanTime: '2024-01-15 10:45 AM', status: 'verified', remarks: '' },
            { id: 5, studentName: 'David Brown', usn: '1MS21CS005', event: 'NSS Activity', registeredAt: '2024-01-19 03:30 PM', scanTime: '-', status: 'rejected', remarks: 'Did not attend' },
        ];
        setParticipants(mockParticipants);
        setFilteredParticipants(mockParticipants);
        setEvents(['Tech Workshop', 'Cultural Fest', 'Sports Day', 'NSS Activity']);
        setLoading(false);
    }, []);

    useEffect(() => {
        let filtered = participants;

        if (selectedEvent !== 'all') {
            filtered = filtered.filter(p => p.event === selectedEvent);
        }

        if (statusFilter !== 'all') {
            filtered = filtered.filter(p => p.status === statusFilter);
        }

        if (searchTerm) {
            filtered = filtered.filter(p =>
                p.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.usn.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        setFilteredParticipants(filtered);
    }, [selectedEvent, statusFilter, searchTerm, participants]);

    const handleStatusChange = (id, newStatus) => {
        setParticipants(participants.map(p =>
            p.id === id ? { ...p, status: newStatus } : p
        ));
    };

    const handleRemarksChange = (id, newRemarks) => {
        setParticipants(participants.map(p =>
            p.id === id ? { ...p, remarks: newRemarks } : p
        ));
    };

    const handleBulkApprove = () => {
        const updated = participants.map(p =>
            filteredParticipants.find(fp => fp.id === p.id) && p.status === 'pending'
                ? { ...p, status: 'verified' }
                : p
        );
        setParticipants(updated);
    };

    const handleBulkReject = () => {
        const updated = participants.map(p =>
            filteredParticipants.find(fp => fp.id === p.id) && p.status === 'pending'
                ? { ...p, status: 'rejected' }
                : p
        );
        setParticipants(updated);
    };

    const getStatusBadge = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            verified: 'bg-green-100 text-green-700 border-green-200',
            rejected: 'bg-red-100 text-red-700 border-red-200'
        };
        const icons = {
            pending: <Clock className="w-3 h-3" />,
            verified: <CheckCircle className="w-3 h-3" />,
            rejected: <XCircle className="w-3 h-3" />
        };
        return (
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${styles[status]}`}>
                {icons[status]}
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    if (loading) {
        return (
            <CoordinatorLayout user={user} title="Manage Participants">
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
            </CoordinatorLayout>
        );
    }

    const content = (
        <>
            {/* Filters & Bulk Actions */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
                <div className="flex flex-col lg:flex-row justify-between gap-4 mb-6">
                    <div className="flex flex-col md:flex-row gap-4 flex-1">
                        {/* Search */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or USN..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {/* Event Filter */}
                        <select
                            value={selectedEvent}
                            onChange={(e) => setSelectedEvent(e.target.value)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">All Events</option>
                            {events.map(event => (
                                <option key={event} value={event}>{event}</option>
                            ))}
                        </select>
                        {/* Status Filter */}
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="all">All Status</option>
                            <option value="pending">Pending</option>
                            <option value="verified">Verified</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>
                </div>

                {/* Bulk Actions */}
                <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
                    <button
                        onClick={handleBulkApprove}
                        className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
                    >
                        <CheckSquare className="w-4 h-4" />
                        Approve All Pending
                    </button>
                    <button
                        onClick={handleBulkReject}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
                    >
                        <XSquare className="w-4 h-4" />
                        Reject All Pending
                    </button>
                    <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors ml-auto">
                        <Download className="w-4 h-4" />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Participants Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Student Name</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">USN</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Scan Time</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                                <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Remarks</th>
                                <th className="text-right py-4 px-6 text-sm font-semibold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredParticipants.length > 0 ? (
                                filteredParticipants.map((participant) => (
                                    <tr key={participant.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="py-4 px-6 text-sm font-medium text-gray-900">
                                            {participant.studentName}
                                            <div className="text-xs text-gray-500 mt-0.5">{participant.event}</div>
                                        </td>
                                        <td className="py-4 px-6 text-sm text-gray-600">{participant.usn}</td>
                                        <td className="py-4 px-6 text-sm text-gray-600 font-mono">{participant.scanTime}</td>
                                        <td className="py-4 px-6">{getStatusBadge(participant.status)}</td>
                                        <td className="py-4 px-6">
                                            <input
                                                type="text"
                                                value={participant.remarks}
                                                onChange={(e) => handleRemarksChange(participant.id, e.target.value)}
                                                placeholder="Add remarks..."
                                                className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <select
                                                value={participant.status}
                                                onChange={(e) => handleStatusChange(participant.id, e.target.value)}
                                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="verified">Approve</option>
                                                <option value="rejected">Reject</option>
                                            </select>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="py-12 text-center text-gray-500">
                                        No participants found matching your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );

    if (embedded) {
        return content;
    }

    return (
        <CoordinatorLayout user={user} title="Participants Verification">
            {content}
        </CoordinatorLayout>
    );
};

export default ManageParticipants;
