import { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import {
    User, Mail, Phone, BookOpen, Award, Download,
    Calendar, MapPin, Clock
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const MyProfile = () => {
    const { user } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const token = localStorage.getItem('token');
                const { data } = await axios.get('http://localhost:5000/api/users/profile', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setProfile(data);
            } catch (error) {
                console.error('Error fetching profile:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

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

        doc.save(`SEAMS_Report_${user.usn}.pdf`);
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <StudentLayout user={user} title="My Profile">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="h-32 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                        <div className="px-6 pb-6 relative">
                            <div className="w-24 h-24 bg-white rounded-full p-1 absolute -top-12 left-1/2 transform -translate-x-1/2 shadow-lg">
                                <div className="w-full h-full bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-3xl font-bold">
                                    {user.name[0]}
                                </div>
                            </div>

                            <div className="mt-16 text-center">
                                <h2 className="text-xl font-bold text-gray-900">{user.name}</h2>
                                <p className="text-gray-500 text-sm">{user.usn}</p>
                                <div className="mt-4 flex justify-center gap-2">
                                    <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-semibold">
                                        {user.branch}
                                    </span>
                                    <span className="px-3 py-1 bg-purple-50 text-purple-600 rounded-full text-xs font-semibold">
                                        Sem {user.semester}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-8 space-y-4">
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Mail className="w-4 h-4 mr-3 text-gray-400" />
                                    {user.email}
                                </div>
                                <div className="flex items-center text-gray-600 text-sm">
                                    <Phone className="w-4 h-4 mr-3 text-gray-400" />
                                    {user.phone || 'Not provided'}
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-gray-600">Total Credits</span>
                                    <span className="text-2xl font-bold text-blue-600">{profile?.totalCredits || 0}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2">
                                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '70%' }}></div>
                                </div>
                                <p className="text-xs text-gray-400 mt-2 text-center">Top 15% of your batch</p>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={downloadReport}
                        className="w-full py-4 bg-white border border-gray-200 text-gray-700 font-bold rounded-2xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                    >
                        <Download className="w-5 h-5 text-blue-600" />
                        Download Participation Report
                    </button>
                </div>

                {/* Right Column: Timeline */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-600" />
                            Activity Timeline
                        </h3>

                        <div className="relative border-l-2 border-gray-100 ml-3 space-y-8 pl-8 pb-4">
                            {profile?.history?.length > 0 ? (
                                profile.history.map((item, index) => (
                                    <div key={index} className="relative">
                                        <div className={`absolute -left-[41px] w-5 h-5 rounded-full border-4 border-white shadow-sm ${item.status === 'verified' ? 'bg-green-500' :
                                                item.status === 'rejected' ? 'bg-red-500' : 'bg-yellow-500'
                                            }`}></div>

                                        <div className="bg-gray-50 rounded-xl p-4 hover:bg-blue-50 transition-colors group">
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                                                    {item.event.title}
                                                </h4>
                                                <span className={`text-xs font-bold px-2 py-1 rounded capitalize ${item.status === 'verified' ? 'bg-green-100 text-green-700' :
                                                        item.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {item.status}
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{item.event.description}</p>
                                            <div className="flex items-center gap-4 text-xs text-gray-400">
                                                <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {new Date(item.event.date).toLocaleDateString()}</span>
                                                <span className="flex items-center"><Award className="w-3 h-3 mr-1" /> {item.event.points} Pts</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-8 text-gray-500">
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
