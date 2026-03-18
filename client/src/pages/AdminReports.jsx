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
                <h2 className="text-2xl font-bold text-white hidden lg:block">Reports Center</h2>
                <p className="text-slate-400">Generate and download system-wide reports.</p>
            </div>

            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-2xl text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
                    <div className="flex items-center gap-3 mb-2 opacity-80 relative z-10">
                        <Users className="w-5 h-5" />
                        <span className="text-sm font-medium">Total Attendance</span>
                    </div>
                    <h3 className="text-3xl font-bold relative z-10">12,450</h3>
                    <p className="text-sm mt-2 font-medium text-emerald-300 relative z-10">+15% from last semester</p>
                </div>
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex items-center gap-3 mb-2 text-slate-400 relative z-10">
                        <BarChart2 className="w-5 h-5 text-fuchsia-400" />
                        <span className="text-sm font-medium">Avg. Participation Rate</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white relative z-10">78%</h3>
                    <p className="text-sm mt-2 text-emerald-400 font-medium relative z-10">+5.2% increase</p>
                </div>
                <div className="glass-card p-6 rounded-2xl relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="flex items-center gap-3 mb-2 text-slate-400 relative z-10">
                        <Calendar className="w-5 h-5 text-amber-400" />
                        <span className="text-sm font-medium">Events Conducted</span>
                    </div>
                    <h3 className="text-3xl font-bold text-white relative z-10">45</h3>
                    <p className="text-sm mt-2 text-slate-400 relative z-10">Across 5 categories</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Report Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-400" /> Available Reports
                    </h3>
                    {reports.map((report) => (
                        <button
                            key={report.id}
                            onClick={() => setSelectedReport(report.id)}
                            className={`w-full p-4 rounded-xl border text-left transition-all duration-300 group relative overflow-hidden ${selectedReport === report.id
                                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_15px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30'
                                    : 'bg-white/5 border-white/10 hover:border-indigo-500/30 hover:bg-white/10'
                                }`}
                        >
                            {selectedReport === report.id && (
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-transparent pointer-events-none"></div>
                            )}
                            <div className="flex items-start gap-4 relative z-10">
                                <div className={`p-3 rounded-xl transition-colors duration-300 ${selectedReport === report.id ? 'bg-indigo-500/20 text-indigo-400 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'bg-white/5 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-400'
                                    }`}>
                                    <report.icon className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <h4 className={`font-bold transition-colors duration-300 ${selectedReport === report.id ? 'text-indigo-300' : 'text-white group-hover:text-indigo-200'}`}>{report.name}</h4>
                                        <span className="inline-block text-[10px] font-bold px-2 py-0.5 bg-white/10 text-slate-300 rounded border border-white/5">
                                            {report.type}
                                        </span>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{report.desc}</p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Preview Pane */}
                <div className="lg:col-span-2 glass-card rounded-3xl flex flex-col h-[600px] overflow-hidden border border-white/10">
                    <div className="p-6 border-b border-white/10 bg-white/5 flex justify-between items-center">
                        <div>
                            <h3 className="text-lg font-bold text-white">Document Preview</h3>
                            <p className="text-sm text-slate-400">Previewing: <span className="text-indigo-300 font-medium">{reports.find(r => r.id === selectedReport)?.name}</span></p>
                        </div>
                        <div className="flex gap-2">
                            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <Printer className="w-5 h-5" />
                            </button>
                            <button className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
                                <Share2 className="w-5 h-5" />
                            </button>
                            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-lg hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/20 border border-indigo-400/30">
                                <Download className="w-4 h-4" /> Download
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 bg-[#090D14] p-8 overflow-y-auto flex items-center justify-center relative">
                        {/* Decorative background grid */}
                        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay"></div>
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

                        <div className="bg-[#131B2F] border border-white/10 w-full max-w-lg aspect-[1/1.4] shadow-2xl p-8 flex flex-col relative z-10 transition-all duration-500 hover:shadow-indigo-500/10">
                            {/* Mock Document Content */}
                            <div className="border-b-2 border-slate-700 pb-4 mb-6 flex justify-between items-end">
                                <div>
                                    <h1 className="text-2xl font-bold text-white tracking-tight">GMU Report</h1>
                                    <p className="text-sm text-slate-400 mt-1">{reports.find(r => r.id === selectedReport)?.name}</p>
                                </div>
                                <div className="text-right">
                                     <p className="text-xs text-slate-500">Generated on:</p>
                                     <p className="text-sm font-medium text-slate-300">{new Date().toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="h-4 bg-white/5 rounded w-3/4 animate-pulse border border-white/5"></div>
                                <div className="h-4 bg-white/5 rounded w-full animate-pulse border border-white/5" style={{ animationDelay: '100ms' }}></div>
                                <div className="h-4 bg-white/5 rounded w-5/6 animate-pulse border border-white/5" style={{ animationDelay: '200ms' }}></div>
                                <div className="h-40 bg-white/5 rounded-xl w-full border border-white/10 mt-8 flex flex-col items-center justify-center text-slate-500 text-sm gap-3">
                                    <BarChart2 className="w-8 h-8 text-indigo-500/50" />
                                    <span>[Data Visualization Area]</span>
                                </div>
                                <div className="h-4 bg-white/5 rounded w-full mt-6 animate-pulse border border-white/5" style={{ animationDelay: '300ms' }}></div>
                                <div className="h-4 bg-white/5 rounded w-4/5 animate-pulse border border-white/5" style={{ animationDelay: '400ms' }}></div>
                            </div>
                            <div className="mt-8 pt-4 border-t border-slate-700/50 text-center flex justify-between items-center">
                                 <span className="text-[10px] text-slate-500 uppercase tracking-widest">Confidential</span>
                                 <span className="text-[10px] text-slate-500 uppercase tracking-widest">Page 1 of 1</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AdminReports;
