import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';

const EventList = () => {
    const [events, setEvents] = useState([]);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const fetchEvents = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/events');
                setEvents(data);
            } catch (error) {
                console.error(error);
            }
        };
        fetchEvents();
    }, []);

    const handleRegister = async (eventId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/registrations', { eventId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Registered successfully!');
        } catch (error) {
            alert(error.response?.data?.message || 'Registration failed');
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="mx-auto max-w-7xl">
                <h2 className="mb-6 text-3xl font-bold text-gray-800">Upcoming Events</h2>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {events.map((event) => (
                        <div key={event._id} className="overflow-hidden bg-white rounded-lg shadow-md hover:shadow-lg">
                            <div className="h-48 bg-gray-200">
                                {/* Placeholder for image */}
                                <div className="flex items-center justify-center h-full text-gray-500">
                                    {event.category}
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="mb-2 text-xl font-bold text-gray-900">{event.title}</h3>
                                <p className="mb-4 text-gray-600 line-clamp-2">{event.description}</p>
                                <div className="flex justify-between mb-4 text-sm text-gray-500">
                                    <span>{new Date(event.date).toLocaleDateString()}</span>
                                    <span>{event.points} Credits</span>
                                </div>
                                {user && user.role === 'student' && (
                                    <button
                                        onClick={() => handleRegister(event._id)}
                                        className="w-full px-4 py-2 font-bold text-white transition bg-blue-600 rounded hover:bg-blue-700"
                                    >
                                        Register
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EventList;
