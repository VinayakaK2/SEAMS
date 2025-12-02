import { useState } from 'react';
import axios from 'axios';
import { X, Phone, ShieldCheck, Loader } from 'lucide-react';
import API_URL from '../config/api';

const PhoneVerificationModal = ({ isOpen, onClose, onVerified }) => {
    const [step, setStep] = useState(1); // 1: Enter Phone, 2: Enter OTP
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    if (!isOpen) return null;

    const handleInitiate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/auth/phone/initiate',
                { phone },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStep(2);
            setSuccess('OTP sent! Check server console (simulation).');
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const token = localStorage.getItem('token');
            await axios.post('http://localhost:5000/api/auth/phone/verify',
                { otp },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setSuccess('Phone verified successfully!');
            setTimeout(() => {
                onVerified(phone);
                onClose();
                setStep(1);
                setPhone('');
                setOtp('');
                setSuccess('');
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-blue-600 p-6 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6" />
                        Verify Phone Number
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                            {error}
                        </div>
                    )}
                    {success && (
                        <div className="mb-4 p-3 bg-green-50 text-green-600 text-sm rounded-lg border border-green-100">
                            {success}
                        </div>
                    )}

                    {step === 1 ? (
                        <form onSubmit={handleInitiate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                                    <input
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="Enter your mobile number"
                                        className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 mt-2">
                                    We will send a 6-digit OTP to this number (Simulated in Console).
                                </p>
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Send OTP'}
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleVerify} className="space-y-4">
                            <div className="text-center mb-4">
                                <p className="text-sm text-gray-600">Enter the OTP sent to</p>
                                <p className="font-semibold text-gray-900">{phone}</p>
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="text-xs text-blue-600 hover:underline mt-1"
                                >
                                    Change Number
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">One Time Password (OTP)</label>
                                <input
                                    type="text"
                                    required
                                    maxLength="6"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    placeholder="Enter 6-digit OTP"
                                    className="w-full text-center tracking-widest text-2xl font-bold py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                            >
                                {loading ? <Loader className="w-5 h-5 animate-spin" /> : 'Verify & Save'}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PhoneVerificationModal;
