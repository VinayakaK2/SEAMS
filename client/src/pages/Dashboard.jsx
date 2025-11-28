import React, { useContext } from 'react';
import AuthContext from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
                <h1 className="mb-4 text-4xl font-bold text-blue-600">Welcome to SEAMS</h1>
                <p className="mb-8 text-xl text-gray-600">Student Engagement & Activity Management System</p>
                <div className="flex gap-4">
                    <button onClick={() => navigate('/login')} className="px-6 py-3 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700">Login</button>
                    <button onClick={() => navigate('/register')} className="px-6 py-3 font-bold text-blue-600 bg-white border border-blue-600 rounded-lg hover:bg-blue-50">Register</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <nav className="bg-white shadow-sm">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-blue-600">SEAMS</h1>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-gray-700">Welcome, {user.name} ({user.role})</span>
                            <button onClick={logout} className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded hover:bg-red-100">Logout</button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="py-10 mx-auto max-w-7xl sm:px-6 lg:px-8">
                {/* Role based content */}
                {user.role === 'student' && <StudentDashboard navigate={navigate} />}
                {user.role === 'coordinator' && <CoordinatorDashboard navigate={navigate} />}
                {user.role === 'admin' && <AdminDashboard navigate={navigate} />}
            </main>
        </div>
    );
};

const StudentDashboard = ({ navigate }) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">My Credits</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">0</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Upcoming Events</h3>
            <p className="mt-2 text-gray-500">Check out new events</p>
            <button onClick={() => navigate('/events')} className="w-full px-4 py-2 mt-4 text-white bg-blue-600 rounded hover:bg-blue-700">Browse Events</button>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Badges</h3>
            <p className="mt-2 text-gray-500">No badges earned yet</p>
        </div>
    </div>
);

const CoordinatorDashboard = ({ navigate }) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Create Event</h3>
            <button onClick={() => navigate('/create-event')} className="w-full px-4 py-2 mt-4 text-white bg-blue-600 rounded hover:bg-blue-700">Create New</button>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Scan QR</h3>
            <button className="w-full px-4 py-2 mt-4 text-white bg-green-600 rounded hover:bg-green-700">Open Scanner</button>
        </div>
    </div>
);

const AdminDashboard = ({ navigate }) => (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Total Users</h3>
            <p className="mt-2 text-3xl font-bold text-purple-600">--</p>
        </div>
        <div className="p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900">Audit Logs</h3>
            <button className="w-full px-4 py-2 mt-4 text-white bg-gray-800 rounded hover:bg-gray-900">View Logs</button>
        </div>
    </div>
);

export default Dashboard;
