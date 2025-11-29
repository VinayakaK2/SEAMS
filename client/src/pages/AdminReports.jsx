import { useState, useContext } from 'react';
import AdminLayout from '../components/AdminLayout';
import AuthContext from '../context/AuthContext';
import {
    FileText, Download, Printer, Share2, BarChart2,
    PieChart, Calendar, Users
} from 'lucide-react';

const AdminReports = () => {
    const { user } = useContext(AuthContext);
    const [selectedReport, setSelectedReport] = useState('participation');

    const reports = [
        { id: 'participation', name: 'Full Participation Report', type: 'PDF', icon: FileText, desc: 'Detailed report of student participation across all events.' },
        { id: 'attendance', name: 'Event Attendance Sheet', type: 'CSV', icon: Users, desc: 'Attendance records for specific events.' },
        { id: 'analytics', name: 'Category-wise Analytics', type: 'CSV', icon: BarChart2, desc: 'Breakdown of credits earned per category.' },
        { id: 'financial', name: 'Event Budget Report', type: 'PDF', icon: PieChart, desc: 'Financial summary of event expenses and sponsorships.' },
    ];

    return (
        <AdminLayout user={user} title="Reports & Analytics">
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900">Reports Center</h2>
                <p className="text-gray-500">Generate and download system-wide reports.</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl text-white shadow-lg shadow-blue-200">
                    <div className="flex items-center gap-3 mb-2 opacity-80">
                        <Users className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Attendance</span>
                    </div>
                    <h3 className="text-3xl font-bold">12,450</h3>
                    <p className="text-sm mt-2 opacity-80">+15% from last semester</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                        <BarChart2 className="w-5 h-5" />
                        <span className="text-sm font-medium">Avg. Participation Rate</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">78%</h3>
                    <p className="text-sm mt-2 text-green-600 font-medium">+5.2% increase</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-2 text-gray-500">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm font-medium">Events Conducted</span>
                    </div>
                    <h3 className="text-3xl font-bold text-gray-900">45</h3>
                    <p className="text-sm mt-2 text-gray-500">Across 5 categories</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Report Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Available Reports</h3>
                    {reports.map((report) => (
                        <button
                            key={report.id}
                            onClick={() => setSelectedReport(report.id)}
                            className={`w-full p-4 rounded-xl border text-left transition-all duration-200 group ${selectedReport === report.id
                                    ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                                    : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'
                                }`}
                        >
                            <div className="flex items-start gap-4">
                                <div className={`p-3 rounded-lg ${selectedReport === report.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-500'
                                    }`}>
                                    <report.icon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className={`font-bold ${selectedReport === report.id ? 'text-blue-900' : 'text-gray-900'}`}>{report.name}</h4>
                                    <p className="text-xs text-gray-500 mt-1">{report.desc}</p>
                                    <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                                        {report.type}
                                    </span>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Preview Pane */}
                <div className="lg:col-span-2 bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col h-[600px]">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Document Preview</h3>
                            <p className="text-sm text-gray-500">Previewing: {reports.find(r => r.id === selectedReport)?.name}</p>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                                <Printer className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg">
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                                <Download className="w-4 h-4" /> Download
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-gray-50 p-8 overflow-y-auto flex items-center justify-center">
                        <div className="bg-white w-full max-w-lg aspect-[1/1.4] shadow-lg p-8 flex flex-col">
                            {/* Mock Document Content */}
                            <div className="border-b-2 border-gray-800 pb-4 mb-6">
                                <h1 className="text-2xl font-bold text-gray-900">SEAMS Report</h1>
                                <p className="text-sm text-gray-500">Generated on: {new Date().toLocaleDateString()}</p>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                                <div className="h-4 bg-gray-100 rounded w-full"></div>
                                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                                <div className="h-32 bg-gray-50 rounded w-full border border-gray-100 mt-8 flex items-center justify-center text-gray-400 text-sm">
                                    [Chart / Data Visualization]
                                </div>
                                <div className="h-4 bg-gray-100 rounded w-full mt-4"></div>
                                <div className="h-4 bg-gray-100 rounded w-4/5"></div>
                            </div>
                            <div className="mt-8 pt-4 border-t border-gray-200 text-center text-xs text-gray-400">
                                Confidential Document • For Internal Use Only
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminReports;
