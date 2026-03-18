import { useState, useContext, useEffect } from 'react';
import AdminLayout from '../components/AdminLayout';
import AuthContext from '../context/AuthContext';
import axios from 'axios';
import {
    Users, Search, Filter, Plus, MoreVertical, Edit, Trash2,
    CheckCircle, XCircle, Mail, Shield, Download, Lock
} from 'lucide-react';
import API_URL from '../config/api';

const UserManagement = () => {
    const { user } = useContext(AuthContext);
    const [users, setUsers] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [filterRole, setFilterRole] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    // Form States
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'coordinator',
        department: 'CSE',
        usn: ''
    });
    const [editingUser, setEditingUser] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.get(`${API_URL}/api/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddUser = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/users`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsAddModalOpen(false);
            setFormData({ name: '', email: '', password: '', role: 'coordinator', department: 'CSE', usn: '' });
            fetchUsers();
        } catch (error) {
            console.error('Error adding user:', error);
            alert(error.response?.data?.message || 'Error adding user');
        }
    };

    const handleEditClick = (user) => {
        setEditingUser(user);
        setFormData({
            name: user.name,
            email: user.email,
            password: '',
            role: user.role,
            department: user.department || 'CSE',
            usn: user.usn || ''
        });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async () => {
        try {
            const token = localStorage.getItem('token');
            const updateData = { ...formData };
            if (!updateData.password) delete updateData.password;

            await axios.put(`${API_URL}/api/users/${editingUser._id}`, updateData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsEditModalOpen(false);
            setEditingUser(null);
            setFormData({ name: '', email: '', password: '', role: 'coordinator', department: 'CSE', usn: '' });
            fetchUsers();
        } catch (error) {
            console.error('Error updating user:', error);
            alert(error.response?.data?.message || 'Error updating user');
        }
    };

    const handleDeleteUser = async (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            try {
                const token = localStorage.getItem('token');
                await axios.delete(`${API_URL}/api/users/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                fetchUsers();
            } catch (error) {
                console.error('Error deleting user:', error);
            }
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesRole = filterRole === 'All' || u.role.toLowerCase() === filterRole.toLowerCase();
        const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesRole && matchesSearch;
    });

    return (
        <AdminLayout user={user} title="User Management">
            {/* Header Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-2xl font-bold text-white hidden lg:block">Users</h2>
                    <p className="text-slate-400">Manage students, coordinators, and faculty members.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <button className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white/5 border border-white/10 text-white font-medium rounded-xl hover:bg-white/10 transition-colors">
                        <Download className="w-4 h-4" /> Export
                    </button>
                    <button
                        onClick={() => {
                            setFormData({ name: '', email: '', password: '', role: 'coordinator', department: 'CSE', usn: '' });
                            setIsAddModalOpen(true);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 text-white font-bold rounded-xl btn-primary transition-all shadow-lg"
                    >
                        <Plus className="w-4 h-4" /> Add User
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="glass-card p-4 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search by name, email, or ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl input-dark"
                    />
                </div>
                <div className="flex items-center w-full md:w-auto">
                    <div className="w-full relative">
                        <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="w-full pl-9 pr-8 py-2.5 rounded-xl input-dark appearance-none select-dark cursor-pointer font-medium"
                        >
                            <option value="All">All Roles</option>
                            <option value="Student">Students</option>
                            <option value="Coordinator">Coordinators</option>
                            <option value="Faculty">Faculty</option>
                            <option value="Admin">Admins</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/10 bg-white/5">
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">User</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">Role</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">Department</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300">Status</th>
                                <th className="py-4 px-6 text-sm font-semibold text-slate-300 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {filteredUsers.map((u) => (
                                <tr key={u._id} className="hover:bg-white/5 transition-colors group">
                                    <td className="py-4 px-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-sm" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-white group-hover:text-indigo-400 transition-colors">{u.name}</p>
                                                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                                                    <Mail className="w-3 h-3" /> {u.email}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold capitalize ${
                                            u.role === 'admin' ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30' :
                                            u.role === 'coordinator' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                                            'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                        }`}>
                                            <Shield className="w-3 h-3" /> {u.role}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-sm text-slate-300">{u.department || '—'}</td>
                                    <td className="py-4 px-6">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                                            u.isEmailVerified ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.isEmailVerified ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                                            {u.isEmailVerified ? 'Active' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleEditClick(u)}
                                                className="p-2 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteUser(u._id)}
                                                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredUsers.length === 0 && (
                                <tr>
                                    <td colSpan="5" className="py-8 text-center text-slate-400">
                                        No users found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal Base Styles */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                    <div className="bg-[#0B0F1A] border border-white/10 rounded-2xl shadow-2xl shadow-indigo-500/10 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-lg font-bold text-white">
                                {isAddModalOpen ? 'Add New Coordinator' : 'Edit User'}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-slate-400 hover:text-white transition-colors">
                                <XCircle className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Full Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl input-dark"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-300 mb-2">Department</label>
                                    <select
                                        name="department"
                                        value={formData.department}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl input-dark select-dark"
                                    >
                                        <option value="CSE">CSE</option>
                                        <option value="ISE">ISE</option>
                                        <option value="ECE">ECE</option>
                                        <option value="MECH">MECH</option>
                                        <option value="CIVIL">CIVIL</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={formData.email}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl input-dark"
                                        placeholder="john@example.com"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">
                                    {isAddModalOpen ? 'Password' : 'New Password (Optional)'}
                                </label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                    <input
                                        type="password"
                                        name="password"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl input-dark"
                                        placeholder={isAddModalOpen ? "Set a password" : "Leave blank to keep current"}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-300 mb-2">Role</label>
                                {isAddModalOpen ? (
                                    <input
                                        type="text"
                                        value="Coordinator"
                                        disabled
                                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/5 text-slate-500 cursor-not-allowed font-medium"
                                    />
                                ) : (
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleInputChange}
                                        className="w-full px-4 py-3 rounded-xl input-dark select-dark"
                                    >
                                        <option value="student">Student</option>
                                        <option value="coordinator">Coordinator</option>
                                        <option value="faculty">Faculty</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-white/10 bg-white/5 flex justify-end gap-3">
                            <button
                                onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                                className="px-5 py-2.5 text-slate-300 font-medium hover:bg-white/10 hover:text-white rounded-xl transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={isAddModalOpen ? handleAddUser : handleUpdateUser}
                                className="px-5 py-2.5 btn-primary text-white font-bold rounded-xl flex items-center gap-2 shadow-lg"
                            >
                                {isAddModalOpen ? <><Plus className="w-4 h-4" /> Create User</> : <><CheckCircle className="w-4 h-4" /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AdminLayout>
    );
};

export default UserManagement;
