import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import CoordinatorLayout from '../components/CoordinatorLayout';
import { Calendar, MapPin, Users, Award, Upload, QrCode as QrCodeIcon, Image } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const CreateEvent = ({ embedded = false }) => {
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
    const [posterPreview, setPosterPreview] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [qrValue, setQrValue] = useState('');
    const [success, setSuccess] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handlePosterUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPosterPreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const generateQR = () => {
        // Generate QR value with event ID (for now use title + timestamp)
        const qrData = JSON.stringify({
            eventTitle: formData.title,
            timestamp: Date.now(),
            id: `evt_${Date.now()}`
        });
        setQrValue(qrData);
        setShowQR(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/events', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSuccess(true);
            setTimeout(() => navigate('/'), 2000);
        } catch (error) {
            alert('Failed to create event');
        }
    };

    const categories = [
        'Technical', 'Cultural', 'Sports', 'NSS', 'Entrepreneurship', 'Placement', 'Life Skills'
    ];

    const content = (
        <>
            {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800">
                    Event created successfully! Redirecting...
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Event Details</h3>
                            <p className="text-gray-500 text-sm">Fill in the information below to create a new event</p>
                        </div>

                        {/* Title */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-gray-700">Event Title *</label>
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., AI & Machine Learning Workshop"
                                required
                            />
                        </div>

                        {/* Description */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-gray-700">Description *</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="Describe the event details, objectives, and key highlights..."
                                required
                            />
                        </div>

                        {/* Date & Time */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Calendar className="w-4 h-4 text-gray-400" />
                                    Date *
                                </label>
                                <input
                                    type="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-gray-700">Time *</label>
                                <input
                                    type="time"
                                    name="time"
                                    value={formData.time}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {/* Venue */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-400" />
                                Venue *
                            </label>
                            <input
                                name="venue"
                                value={formData.venue}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                placeholder="e.g., Main Auditorium, Block A"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-gray-700">Category *</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Points & Max Participants */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-gray-400" />
                                    Points *
                                </label>
                                <input
                                    type="number"
                                    name="points"
                                    value={formData.points}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    min="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-gray-400" />
                                    Max Participants
                                </label>
                                <input
                                    type="number"
                                    name="maxParticipants"
                                    value={formData.maxParticipants}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    min="0"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Poster Upload */}
                        <div className="mb-8">
                            <label className="block mb-2 text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Image className="w-4 h-4 text-gray-400" />
                                Event Poster
                            </label>
                            <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-blue-400 transition-colors">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePosterUpload}
                                    className="hidden"
                                    id="poster-upload"
                                />
                                <label htmlFor="poster-upload" className="cursor-pointer">
                                    <Upload className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                                    <p className="text-sm text-gray-600">Click to upload event poster</p>
                                    <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                className="flex-1 px-6 py-3 font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm"
                            >
                                Create Event
                            </button>
                            <button
                                type="button"
                                onClick={generateQR}
                                className="px-6 py-3 font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2"
                            >
                                <QrCodeIcon className="w-5 h-5" />
                                Generate QR
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sidebar - Preview & QR */}
                <div className="space-y-6">
                    {/* Poster Preview */}
                    {posterPreview && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-4">Poster Preview</h4>
                            <img src={posterPreview} alt="Event Poster" className="w-full rounded-xl border border-gray-100" />
                        </div>
                    )}

                    {/* QR Code Preview */}
                    {showQR && qrValue && (
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                            <h4 className="text-sm font-bold text-gray-900 mb-4">QR Code</h4>
                            <div className="bg-white p-4 border border-gray-100 rounded-xl flex justify-center">
                                <QRCodeSVG
                                    value={qrValue}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <p className="text-xs text-gray-500 mt-3 text-center">Students can scan this to register</p>
                        </div>
                    )}

                    {/* Helper Text */}
                    <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
                        <h4 className="text-sm font-bold text-blue-900 mb-2">💡 Pro Tip</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                            Generate a QR code for easy student check-in during the event. You can download and display it at the venue.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );

    if (embedded) {
        return content;
    }

    return (
        <CoordinatorLayout user={user} title="Create New Event">
            {content}
        </CoordinatorLayout>
    );
};

export default CreateEvent;
