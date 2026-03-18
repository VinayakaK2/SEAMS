import { useState, useContext } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import CoordinatorLayout from '../components/CoordinatorLayout';
import { Calendar, MapPin, Users, Award, Upload, QrCode as QrCodeIcon, Image, Plus, X, Phone, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import API_URL from '../config/api';

const CreateEvent = ({ embedded = false }) => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        startDate: '',
        startTime: '',
        endDate: '',
        endTime: '',
        venue: '',
        category: 'Technical',
        points: 0,
        maxParticipants: 0,
    });
    const [coordinators, setCoordinators] = useState([{ name: '', phone: '' }]);
    const [posterPreview, setPosterPreview] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [qrValue, setQrValue] = useState('');
    const [success, setSuccess] = useState(false);


    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCoordinatorChange = (index, field, value) => {
        const newCoordinators = [...coordinators];
        newCoordinators[index][field] = value;
        setCoordinators(newCoordinators);
    };

    const addCoordinator = () => {
        setCoordinators([...coordinators, { name: '', phone: '' }]);
    };

    const removeCoordinator = (index) => {
        if (coordinators.length > 1) {
            setCoordinators(coordinators.filter((_, i) => i !== index));
        }
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
            const eventData = {
                ...formData,
                // Combine date and time for backward compatibility
                date: formData.startDate,
                time: formData.startTime,
                coordinators: coordinators.filter(c => c.name || c.phone) // Only send non-empty coordinators
            };
            await axios.post('http://localhost:5000/api/events', eventData, {
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
                <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 font-medium">
                    Event created successfully! Redirecting...
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="glass-card rounded-3xl p-8">
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-white mb-2">Event Details</h3>
                            <p className="text-slate-400 text-sm">Fill in the information below to create a new event</p>
                        </div>

                        {/* Title */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-slate-300">Event Title *</label>
                            <input
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                className="input-dark w-full"
                                placeholder="e.g., AI & Machine Learning Workshop"
                                required
                            />
                        </div>


                        {/* Description */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-slate-300">Description *</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows="4"
                                className="input-dark w-full resize-none"
                                placeholder="Describe the event details, objectives, and key highlights..."
                                required
                            />
                        </div>

                        {/* Start Date & Time */}
                        <div className="mb-6">
                            <label className="block mb-3 text-sm font-semibold text-slate-300">Event Start *</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-xs text-slate-400 flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                        Start Date
                                    </label>
                                    <input
                                        type="date"
                                        name="startDate"
                                        value={formData.startDate}
                                        onChange={handleChange}
                                        className="input-dark w-full"
                                        required
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-xs text-slate-400">Start Time</label>
                                    <input
                                        type="time"
                                        name="startTime"
                                        value={formData.startTime}
                                        onChange={handleChange}
                                        className="input-dark w-full"
                                        required
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* End Date & Time */}
                        <div className="mb-6">
                            <label className="block mb-3 text-sm font-semibold text-slate-300">Event End *</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-xs text-slate-400 flex items-center gap-2">
                                        <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        name="endDate"
                                        value={formData.endDate}
                                        onChange={handleChange}
                                        className="input-dark w-full"
                                        required
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                                <div>
                                    <label className="block mb-2 text-xs text-slate-400">End Time</label>
                                    <input
                                        type="time"
                                        name="endTime"
                                        value={formData.endTime}
                                        onChange={handleChange}
                                        className="input-dark w-full"
                                        required
                                        style={{ colorScheme: 'dark' }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Event Coordinators */}
                        <div className="mb-6">
                            <div className="flex justify-between items-center mb-3">
                                <label className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <User className="w-4 h-4 text-indigo-400" />
                                    Event Coordinators
                                </label>
                                <button
                                    type="button"
                                    onClick={addCoordinator}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors border border-transparent hover:border-indigo-500/30"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Coordinator
                                </button>
                            </div>
                            <div className="space-y-3">
                                {coordinators.map((coordinator, index) => (
                                    <div key={index} className="flex gap-3 items-start p-4 bg-white/5 rounded-xl border border-white/10 hover:border-white/20 transition-colors">
                                        <div className="flex-1 grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block mb-1 text-xs text-slate-400">Name</label>
                                                <input
                                                    type="text"
                                                    value={coordinator.name}
                                                    onChange={(e) => handleCoordinatorChange(index, 'name', e.target.value)}
                                                    className="input-dark w-full py-2 text-sm"
                                                    placeholder="Coordinator name"
                                                />
                                            </div>
                                            <div>
                                                <label className="block mb-1 text-xs text-slate-400 flex items-center gap-1">
                                                    <Phone className="w-3 h-3 text-indigo-400" />
                                                    Phone Number
                                                </label>
                                                <input
                                                    type="tel"
                                                    value={coordinator.phone}
                                                    onChange={(e) => handleCoordinatorChange(index, 'phone', e.target.value)}
                                                    className="input-dark w-full py-2 text-sm"
                                                    placeholder="+91 XXXXX XXXXX"
                                                />
                                            </div>
                                        </div>
                                        {coordinators.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeCoordinator(index)}
                                                className="mt-6 p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-500/30"
                                                title="Remove coordinator"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Venue */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-indigo-400" />
                                Venue *
                            </label>
                            <input
                                name="venue"
                                value={formData.venue}
                                onChange={handleChange}
                                className="input-dark w-full"
                                placeholder="e.g., Main Auditorium, Block A"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div className="mb-6">
                            <label className="block mb-2 text-sm font-semibold text-slate-300">Category *</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="input-dark w-full appearance-none pr-10"
                            >
                                {categories.map(cat => (
                                    <option key={cat} value={cat} className="bg-[#1a2235]">{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Points & Max Participants */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Award className="w-4 h-4 text-amber-400" />
                                    Points *
                                </label>
                                <input
                                    type="number"
                                    name="points"
                                    value={formData.points}
                                    onChange={handleChange}
                                    className="input-dark w-full"
                                    min="0"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block mb-2 text-sm font-semibold text-slate-300 flex items-center gap-2">
                                    <Users className="w-4 h-4 text-indigo-400" />
                                    Max Participants
                                </label>
                                <input
                                    type="number"
                                    name="maxParticipants"
                                    value={formData.maxParticipants}
                                    onChange={handleChange}
                                    className="input-dark w-full"
                                    min="0"
                                    placeholder="Optional"
                                />
                            </div>
                        </div>

                        {/* Poster Upload */}
                        <div className="mb-8">
                            <label className="block mb-2 text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <Image className="w-4 h-4 text-indigo-400" />
                                Event Poster
                            </label>
                            <div className="border-2 border-dashed border-white/10 bg-white/5 rounded-xl p-6 text-center hover:border-indigo-500/50 hover:bg-white/10 transition-colors group">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handlePosterUpload}
                                    className="hidden"
                                    id="poster-upload"
                                />
                                <label htmlFor="poster-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-12 h-12 text-slate-500 mb-3 group-hover:text-indigo-400 transition-colors" />
                                    <p className="text-sm text-slate-300 font-medium">Click to upload event poster</p>
                                    <p className="text-xs text-slate-500 mt-1">PNG, JPG up to 5MB</p>
                                </label>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <div className="flex gap-4">
                            <button
                                type="submit"
                                className="flex-1 btn-primary"
                            >
                                Create Event
                            </button>
                            <button
                                type="button"
                                onClick={generateQR}
                                className="px-6 py-3 font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 rounded-xl hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors flex items-center gap-2"
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
                        <div className="glass-card rounded-3xl p-6">
                            <h4 className="text-sm font-bold text-white mb-4">Poster Preview</h4>
                            <img src={posterPreview} alt="Event Poster" className="w-full rounded-xl border border-white/10 shadow-lg" />
                        </div>
                    )}

                    {/* QR Code Preview */}
                    {showQR && qrValue && (
                        <div className="glass-card rounded-3xl p-6 relative overflow-hidden group">
                           <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                            <h4 className="text-sm font-bold text-white mb-4 relative z-10 flex items-center justify-between">
                                QR Code
                                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Ready</span>
                            </h4>
                            <div className="bg-white p-4 rounded-xl flex justify-center relative z-10 shadow-lg ring-4 ring-white/5">
                                <QRCodeSVG
                                    value={qrValue}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                />
                            </div>
                            <p className="text-xs text-slate-400 mt-4 text-center relative z-10">Students can scan this to register</p>
                        </div>
                    )}

                    {/* Helper Text */}
                    <div className="bg-indigo-500/10 rounded-2xl p-6 border border-indigo-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                            <QrCodeIcon className="w-24 h-24 text-indigo-400 transform rotate-12" />
                        </div>
                        <h4 className="text-sm font-bold text-indigo-300 mb-2 flex items-center gap-2 relative z-10">
                            <span className="text-base">💡</span> Pro Tip
                        </h4>
                        <p className="text-xs text-indigo-200/80 leading-relaxed relative z-10">
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
