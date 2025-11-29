import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import CoordinatorLayout from '../components/CoordinatorLayout';
import { Download, FileText, Calendar, Users, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const EventReports = ({ embedded = false }) => {
    const { user } = useContext(AuthContext);
    const [events, setEvents] = useState([]);
    const [selectedEvent, setSelectedEvent] = useState('');
    const [reportData, setReportData] = useState(null);
    const [loading, setLoading] = useState(false);

    // Mock data
    useEffect(() => {
        const mockEvents = [
            { id: 1, title: 'Tech Workshop', date: '2024-01-15' },
            { id: 2, title: 'Cultural Fest', date: '2024-01-20' },
            { id: 3, title: 'Sports Day', date: '2024-01-25' },
        ];
        setEvents(mockEvents);
    }, []);

    const generateReport = () => {
        if (!selectedEvent) return;

        // Mock report data
        const mockData = {
            event: events.find(e => e.id === parseInt(selectedEvent)),
            stats: {
                totalRegistered: 45,
                attended: 38,
                approved: 35,
                rejected: 3,
                pending: 7
            },
            participants: [
                { name: 'John Doe', usn: '1MS21CS001', registeredAt: '2024-01-15 10:30 AM', status: 'Approved', scanTime: '2024-01-20 09:15 AM' },
                { name: 'Jane Smith', usn: '1MS21CS002', registeredAt: '2024-01-16 02:15 PM', status: 'Approved', scanTime: '2024-01-20 09:20 AM' },
                { name: 'Mike Johnson', usn: '1MS21CS003', registeredAt: '2024-01-17 09:45 AM', status: 'Pending', scanTime: '-' },
                { name: 'Sarah Williams', usn: '1MS21CS004', registeredAt: '2024-01-18 11:20 AM', status: 'Approved', scanTime: '2024-01-20 09:30 AM' },
            ],
            analytics: [
                { time: '9:00 AM', count: 5 },
                { time: '9:30 AM', count: 12 },
                { time: '10:00 AM', count: 25 },
                { time: '10:30 AM', count: 32 },
                { time: '11:00 AM', count: 38 },
            ]
        };
        setReportData(mockData);
    };

    const downloadCSV = () => {
        if (!reportData) return;

        const csvData = reportData.participants.map(p => ({
            Name: p.name,
            USN: p.usn,
            'Registered At': p.registeredAt,
            Status: p.status,
            'Scan Time': p.scanTime
        }));

        const csv = [
            Object.keys(csvData[0]).join(','),
            ...csvData.map(row => Object.values(row).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${reportData.event.title}_Report.csv`;
        a.click();
    };

    const downloadPDF = () => {
        if (!reportData) return;

        const doc = new jsPDF();

        // Title
        doc.setFontSize(20);
        doc.setTextColor(41, 98, 255);
        doc.text('Event Attendance Report', 14, 22);

        // Event Details
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Event: ${reportData.event.title}`, 14, 35);
        doc.text(`Date: ${new Date(reportData.event.date).toLocaleDateString()}`, 14, 42);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 49);

        // Stats
        doc.text(`Total Registered: ${reportData.stats.totalRegistered}`, 14, 62);
        doc.text(`Attended: ${reportData.stats.attended}`, 14, 69);
        doc.text(`Approved: ${reportData.stats.approved}`, 14, 76);
        doc.text(`Rejected: ${reportData.stats.rejected}`, 14, 83);
        doc.text(`Pending: ${reportData.stats.pending}`, 14, 90);

        // Table
        const tableColumn = ["Name", "USN", "Registered At", "Status", "Scan Time"];
        const tableRows = reportData.participants.map(p => [
            p.name,
            p.usn,
            p.registeredAt,
            p.status,
            p.scanTime
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 100,
            theme: 'grid',
            headStyles: { fillColor: [41, 98, 255] },
        });

        doc.save(`${reportData.event.title}_Report.pdf`);
    };

    const content = (
        <>
            {/* Event Selector */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 mb-8">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Generate Report</h3>
                <div className="flex gap-4">
                    <select
                        value={selectedEvent}
                        onChange={(e) => setSelectedEvent(e.target.value)}
                        className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">Select an event...</option>
                        {events.map(event => (
                            <option key={event.id} value={event.id}>{event.title} - {new Date(event.date).toLocaleDateString()}</option>
                        ))}
                    </select>
                    <button
                        onClick={generateReport}
                        disabled={!selectedEvent}
                        className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                        Generate Report
                    </button>
                </div>
            </div>

            {/* Report Display */}
            {reportData && (
                <>
                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
                        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                            <div className="flex items-center justify-between mb-2">
                                <Users className="w-6 h-6 text-blue-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-blue-900">{reportData.stats.totalRegistered}</h3>
                            <p className="text-sm font-medium text-blue-700 mt-1">Registered</p>
                        </div>
                        <div className="bg-purple-50 rounded-2xl p-6 border border-purple-100">
                            <div className="flex items-center justify-between mb-2">
                                <CheckCircle className="w-6 h-6 text-purple-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-purple-900">{reportData.stats.attended}</h3>
                            <p className="text-sm font-medium text-purple-700 mt-1">Attended</p>
                        </div>
                        <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
                            <div className="flex items-center justify-between mb-2">
                                <CheckCircle className="w-6 h-6 text-green-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-green-900">{reportData.stats.approved}</h3>
                            <p className="text-sm font-medium text-green-700 mt-1">Approved</p>
                        </div>
                        <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                            <div className="flex items-center justify-between mb-2">
                                <XCircle className="w-6 h-6 text-red-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-red-900">{reportData.stats.rejected}</h3>
                            <p className="text-sm font-medium text-red-700 mt-1">Rejected</p>
                        </div>
                        <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-100">
                            <div className="flex items-center justify-between mb-2">
                                <Clock className="w-6 h-6 text-yellow-600" />
                            </div>
                            <h3 className="text-2xl font-bold text-yellow-900">{reportData.stats.pending}</h3>
                            <p className="text-sm font-medium text-yellow-700 mt-1">Pending</p>
                        </div>
                    </div>

                    {/* Analytics Graph */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 mb-8">
                        <div className="flex items-center gap-2 mb-6">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            <h3 className="text-lg font-bold text-gray-900">Participation Analytics</h3>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={reportData.analytics}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                    <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} />
                                    <Tooltip
                                        cursor={{ fill: '#F3F4F6' }}
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    />
                                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Export Buttons */}
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={downloadCSV}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                        >
                            <Download className="w-5 h-5" />
                            Download CSV
                        </button>
                        <button
                            onClick={downloadPDF}
                            className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 transition-colors"
                        >
                            <FileText className="w-5 h-5" />
                            Download PDF
                        </button>
                    </div>

                    {/* Participants Table */}
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-lg font-bold text-gray-900">Participants</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Name</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">USN</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Registered At</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Status</th>
                                        <th className="text-left py-4 px-6 text-sm font-semibold text-gray-700">Scan Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {reportData.participants.map((participant, index) => (
                                        <tr key={index} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                            <td className="py-4 px-6 text-sm font-medium text-gray-900">{participant.name}</td>
                                            <td className="py-4 px-6 text-sm text-gray-600">{participant.usn}</td>
                                            <td className="py-4 px-6 text-sm text-gray-400">{participant.registeredAt}</td>
                                            <td className="py-4 px-6">
                                                <span className={`inline-flex items-center px-2 py-1 rounded-lg text-xs font-medium ${participant.status === 'Approved' ? 'bg-green-100 text-green-700' :
                                                    participant.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {participant.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-gray-400">{participant.scanTime}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}
        </>
    );

    if (embedded) {
        return content;
    }

    return (
        <CoordinatorLayout user={user} title="Event Reports">
            {content}
        </CoordinatorLayout>
    );
};

export default EventReports;
