import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import {
    User, Mail, Phone, BookOpen, Award, Download,
    Calendar, MapPin, Clock, Tag
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import API_URL from '../config/api';

const MyProfile = () => {
    const { user } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Editable interests/skills
    const [interests, setInterests] = useState([]);
    const [skills, setSkills] = useState([]);
    const [editingInterests, setEditingInterests] = useState(false);
    const [editingSkills, setEditingSkills] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get('http://localhost:5000/api/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfile(data);
                // Parse strings from DB if needed
                setInterests(typeof data.interests === 'string' ? JSON.parse(data.interests) : (data.interests || []));
                setSkills(typeof data.skills === 'string' ? JSON.parse(data.skills) : (data.skills || []));
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    const addInterest = (val) => {
        if (!interests.includes(val)) setInterests([...interests, val]);
    };

    const removeInterest = (val) => {
        setInterests(interests.filter(i => i !== val));
    };

    const addSkill = (val) => {
        if (!skills.includes(val)) setSkills([...skills, val]);
    };

    const removeSkill = (val) => {
        setSkills(skills.filter(s => s !== val));
    };

    const saveProfileUpdates = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            const { data } = await axios.put('http://localhost:5000/api/users/profile', 
                { interests, skills },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setProfile(data);
            setEditingInterests(false);
            setEditingSkills(false);
        } catch (error) {
            console.error('Save profile error:', error);
        } finally {
            setSaving(false);
        }
    };

    const downloadReport = () => {
        if (!profile) return;

        const doc = new jsPDF();

        // Header
        doc.setFontSize(20);
        doc.setTextColor(41, 98, 255); // Blue
        doc.text('Student Participation Report', 14, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

        // Student Details
        doc.setFontSize(12);
        doc.setTextColor(0);
        doc.text(`Name: ${user.name}`, 14, 45);
        doc.text(`USN: ${user.usn}`, 14, 52);
        doc.text(`Branch: ${user.branch}`, 14, 59);
        doc.text(`Semester: ${user.semester}`, 14, 66);
        doc.text(`Total Credits: ${profile.totalCredits || 0}`, 14, 73);

        // Table
        const tableColumn = ["Event", "Date", "Category", "Status", "Points"];
        const tableRows = [];

        profile.history?.forEach(item => {
            const eventData = [
                item.event.title,
                new Date(item.event.date).toLocaleDateString(),
                item.event.category,
                item.status,
                item.status === 'verified' ? item.event.points : 0
            ];
            tableRows.push(eventData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 85,
            theme: 'grid',
            headStyles: { fillColor: [41, 98, 255] },
        });

        doc.save(`GMU_Report_${user.usn}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="w-12 h-12 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: '#6366F1', borderRightColor: '#8B5CF6' }}></div>
            </div>
        );
    }

    return (
        <StudentLayout user={user} title="My Profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card overflow-hidden">
                        <div className="h-32" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}></div>
                        <div className="px-6 pb-6 relative">
                            <div className="w-24 h-24 rounded-full p-1 absolute -top-12 left-1/2 transform -translate-x-1/2 shadow-glow-purple" style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                                <div className="w-full h-full rounded-full flex items-center justify-center text-white text-3xl font-bold" style={{ background: 'rgba(11,15,26,0.9)' }}>
                                    {user.name[0]}
                                </div>
                            </div>

                            <div className="mt-16 text-center">
                                <h2 className="text-xl font-bold text-white">{user.name}</h2>
                                <p className="text-slate-400 text-sm">{user.usn}</p>
                                <div className="mt-4 flex justify-center gap-2">
                                    <span className="badge-dark">{user.branch}</span>
                                    <span className="px-3 py-1 rounded-full text-xs font-semibold" style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', color: '#C4B5FD' }}>Sem {user.semester}</span>
                                </div>
                            </div>

                            <div className="mt-8 space-y-4">
                                <div className="flex items-center text-slate-400 text-sm">
                                    <Mail className="w-4 h-4 mr-3 text-indigo-500" />
                                    {user.email}
                                </div>
                                <div className="flex items-center text-slate-400 text-sm">
                                    <Phone className="w-4 h-4 mr-3 text-indigo-500" />
                                    {user.phone || 'Not provided'}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-slate-400">Total Credits</span>
                                    <span className="text-2xl font-bold gradient-text">{profile?.credits || 0}</span>
                                </div>
                                <div className="w-full rounded-full h-2" style={{ background: 'rgba(255,255,255,0.06)' }}>
                                    <div className="h-2 rounded-full" style={{ width: '70%', background: 'linear-gradient(135deg,#6366F1,#8B5CF6)' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Interests & Skills Editor */}
                    <div className="glass-card p-6 space-y-6">
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-indigo-400" /> My Interests
                                </h3>
                                <button
                                    onClick={() => setEditingInterests(!editingInterests)}
                                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                                >
                                    {editingInterests ? 'Cancel' : 'Edit'}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(interests || []).map(interest => (
                                    <span key={interest} className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-full text-xs flex items-center gap-2">
                                        {interest}
                                        {editingInterests && (
                                            <button onClick={() => removeInterest(interest)} className="hover:text-white">×</button>
                                        )}
                                    </span>
                                ))}
                                {editingInterests && (
                                    <input
                                        type="text"
                                        placeholder="Add + Enter"
                                        className="bg-transparent border-b border-indigo-500/30 text-xs text-white outline-none w-24"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value) {
                                                addInterest(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-purple-400" /> My Skills
                                </h3>
                                <button
                                    onClick={() => setEditingSkills(!editingSkills)}
                                    className="text-xs font-semibold text-purple-400 hover:text-purple-300"
                                >
                                    {editingSkills ? 'Cancel' : 'Edit'}
                                </button>
                            </div>

                            <div className="flex flex-wrap gap-2">
                                {(skills || []).map(skill => (
                                    <span key={skill} className="px-3 py-1 bg-purple-500/10 border border-purple-500/20 text-purple-300 rounded-full text-xs flex items-center gap-2">
                                        {skill}
                                        {editingSkills && (
                                            <button onClick={() => removeSkill(skill)} className="hover:text-white">×</button>
                                        )}
                                    </span>
                                ))}
                                {editingSkills && (
                                    <input
                                        type="text"
                                        placeholder="Add + Enter"
                                        className="bg-transparent border-b border-purple-500/30 text-xs text-white outline-none w-24"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.target.value) {
                                                addSkill(e.target.value);
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                )}
                            </div>
                        </div>

                        {(editingInterests || editingSkills) && (
                            <button
                                onClick={saveProfileUpdates}
                                disabled={saving}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                            >
                                {saving ? 'Saving...' : 'Save Changes'}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={downloadReport}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-4 shadow-glow"
                    >
                        <Download className="w-5 h-5" />
                        Download Participation Report
                    </button>
                </div>

                {/* Right Column: Timeline */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-8">
                        <h3 className="section-title mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-400" />
                            Activity Timeline
                        </h3>

                        <div className="relative border-l-2 ml-3 space-y-8 pl-8 pb-4" style={{ borderColor: 'rgba(99,102,241,0.2)' }}>
                            {profile?.history?.length > 0 ? (
                                profile.history.map((item, index) => (
                                    <div key={index} className="relative">
                                        <div className={`absolute -left-[41px] w-5 h-5 rounded-full border-4 shadow-sm ${item.status === 'verified' ? 'bg-emerald-500' :
                                                item.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                                            }`} style={{ borderColor: '#0B0F1A' }}></div>

                                        <div className="rounded-xl p-4 transition-all group" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.07)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.2)'; }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}>
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                                                    {item.event.title}
                                                </h4>
                                                <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${
                                                    item.status === 'verified' ? 'badge-success' :
                                                    item.status === 'rejected' ? 'badge-danger' : 'badge-warning'
                                                }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-400 mb-3 line-clamp-2">{item.event.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(item.event.date).toLocaleDateString()}</span>
                                                <span className="flex items-center"><Award className="w-3 h-3 mr-1" /> {item.event.points} Pts</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-slate-500">
                                    No activity history found. Register for events to start building your timeline!
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </StudentLayout>
    );
};

export default MyProfile;
