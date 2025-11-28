import React, { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';

const CreateEvent = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        date: '',
        time: '',
        venue: '',
        category: 'Technical',
        points: 0,
        maxParticipants: 0,
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/events', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            navigate('/');
        } catch (error) {
            alert('Failed to create event');
        }
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-2xl p-8 mx-auto bg-white rounded-lg shadow">
                <h2 className="mb-6 text-2xl font-bold text-gray-800">Create New Event</h2>
                <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-bold text-gray-700">Event Title</label>
                        <input name="title" onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
                    </div>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-bold text-gray-700">Description</label>
                        <textarea name="description" onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block mb-2 text-sm font-bold text-gray-700">Date</label>
                            <input type="date" name="date" onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-bold text-gray-700">Time</label>
                            <input type="time" name="time" onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
                        </div>
                    </div>
                    <div className="mb-4">
                        <label className="block mb-2 text-sm font-bold text-gray-700">Venue</label>
                        <input name="venue" onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block mb-2 text-sm font-bold text-gray-700">Category</label>
                            <select name="category" onChange={handleChange} className="w-full px-3 py-2 border rounded">
                                <option value="Technical">Technical</option>
                                <option value="Cultural">Cultural</option>
                                <option value="Sports">Sports</option>
                                <option value="NSS">NSS</option>
                                <option value="Entrepreneurship">Entrepreneurship</option>
                            </select>
                        </div>
                        <div>
                            <label className="block mb-2 text-sm font-bold text-gray-700">Points</label>
                            <input type="number" name="points" onChange={handleChange} className="w-full px-3 py-2 border rounded" required />
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="block mb-2 text-sm font-bold text-gray-700">Max Participants</label>
                        <input type="number" name="maxParticipants" onChange={handleChange} className="w-full px-3 py-2 border rounded" />
                    </div>
                    <button type="submit" className="w-full px-4 py-2 font-bold text-white bg-blue-600 rounded hover:bg-blue-700">
                        Create Event
                    </button>
                </form>
            </div>
        </div>
    );
};

export default CreateEvent;
