import React, { useState, useEffect } from 'react';
import axios from 'axios';

const AuditLogs = () => {
    const [logs, setLogs] = useState([]);

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

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="mx-auto max-w-7xl">
                <h2 className="mb-6 text-3xl font-bold text-gray-800">System Audit Logs</h2>
                <div className="overflow-hidden bg-white rounded-lg shadow">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Action</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Performed By</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Target</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-xs font-medium tracking-wider text-left text-gray-500 uppercase">Details</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {logs.map((log) => (
                                <tr key={log._id}>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">{log.action}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{log.performedBy?.name || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{log.targetType} ({log.targetId})</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                                        <pre className="text-xs">{JSON.stringify(log.details, null, 2)}</pre>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AuditLogs;
