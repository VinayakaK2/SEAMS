import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AdminLayout from '../components/AdminLayout';
import AuthContext from '../context/AuthContext';
import { Search, Filter, Download, Shield, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import API_URL from '../config/api';

const AuditLogs = () => {
    const { user } = useContext(AuthContext);
    const [logs, setLogs] = useState([]);
    const [filterType, setFilterType] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get('http://localhost:5000/api/audit', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setLogs(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchLogs();
    }, []);

    // Mock data if API returns empty (for demonstration)
    const displayLogs = logs.length > 0 ? logs : [
        { _id: 1, action: 'USER_LOGIN', performedBy: { name: 'Admin User' }, targetType: 'System', timestamp: new Date().toISOString(), status: 'success', details: { ip: '192.168.1.1' } },
        { _id: 2, action: 'EVENT_CREATED', performedBy: { name: 'John Coordinator' }, targetType: 'Event', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success', details: { eventId: '123' } },
        { _id: 3, action: 'USER_REGISTERED', performedBy: { name: 'System' }, targetType: 'User', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'success', details: { userId: '456' } },
        { _id: 4, action: 'LOGIN_FAILED', performedBy: { name: 'Unknown' }, targetType: 'Auth', timestamp: new Date(Date.now() - 86400000).toISOString(), status: 'failed', details: { reason: 'Invalid password' } },
    ];

    const filteredLogs = displayLogs.filter(log => {
        const matchesSearch =
            log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.performedBy?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filterType === 'All' || log.status === filterType.toLowerCase();
        return matchesSearch && matchesFilter;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case 'success':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"><CheckCircle className="w-3 h-3" /> Success</span>;
            case 'failed':
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30"><AlertTriangle className="w-3 h-3" /> Failed</span>;
            default:
                return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-white/10 text-gray-300 border border-white/10"><Info className="w-3 h-3" /> Info</span>;
        }
    };

    return (
        <AdminLayout user={user} title="System Logs">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white hidden lg:block">Audit Trail</h2>
                    <p className="text-slate-400">Tamper-proof record of all system activities.</p>
                </div>
                <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors">
                    <Download className="w-4 h-4" /> Export Logs
                </button>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search logs..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl input-dark"
                    />
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-xl border border-white/10 relative">
                        <Filter className="w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filterType}
                            onChange={(e) => setFilterType(e.target.value)}
                            className="bg-transparent border-none outline-none text-sm font-medium text-white cursor-pointer select-dark appearance-none pr-6"
                        >
                            <option value="All">All Status</option>
                            <option value="Success">Success</option>
                            <option value="Failed">Failed</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden border border-white/10">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 border-b border-white/10">
                            <tr>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">Timestamp</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">User</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">Action Type</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">Description</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredLogs.map((log) => (
                                <tr key={log._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-6 text-sm text-slate-400 font-mono">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                                                {log.performedBy?.name?.charAt(0) || '?'}
                                            </div>
                                            <span className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{log.performedBy?.name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono uppercase">
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-400 max-w-xs truncate">
                                        {log.targetType} ({log.targetId || 'N/A'})
                                    </td>
                                    <td className="py-4 px-6">
                                        {getStatusBadge(log.status)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AdminLayout>
    );
};

export default AuditLogs;
