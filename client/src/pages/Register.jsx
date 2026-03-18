import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Eye, EyeOff, ArrowRight, Sparkles, User, Mail, Hash, Phone, BookOpen, GraduationCap } from 'lucide-react';
import { motion } from 'framer-motion';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        usn: '',
        branch: '',
        year: '',
        phone: '',
        password: '',
        email: '',
    });
    const [showPassword, setShowPassword] = useState(false);
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const semesterMap = { '1st Year': '1', '2nd Year': '3', '3rd Year': '5', '4th Year': '7' };
        const payload = { ...formData, semester: semesterMap[formData.year] || '1', role: 'student' };
        const result = await register(payload);
        setLoading(false);
        if (result.success) {
            alert(result.message || 'Registration successful! Please check your email to verify your account.');
            navigate('/login');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="flex min-h-screen page-bg overflow-hidden">
            {/* ─── LEFT PANEL ─── */}
            <div className="hidden lg:flex w-2/5 relative flex-col justify-center items-center p-12 overflow-hidden">
                <div className="ambient-blob w-72 h-72 bg-violet-600/25 top-[-10%] left-[-15%] animate-blob" />
                <div className="ambient-blob w-80 h-80 bg-indigo-600/20 bottom-[0%] right-[-10%] animate-blob-2" />
                <div className="ambient-blob w-56 h-56 bg-pink-500/15 top-[45%] left-[10%] animate-blob-3" />
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%236366F1%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

                <motion.div
                    className="relative z-10 max-w-sm"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <div className="flex items-center gap-3 mb-10">
                        <img src="/gmu-logo.png" alt="GMU Logo" className="h-12 w-auto object-contain" />
                        <span className="text-2xl font-bold text-white">GM University</span>
                    </div>
                    <h1 className="text-4xl font-extrabold text-white leading-tight mb-4">
                        Join the <br /><span className="gradient-text">Community.</span>
                    </h1>
                    <p className="text-slate-400 text-base leading-relaxed mb-8">
                        Create your student profile and start participating in campus activities, workshops, and events.
                    </p>
                    {/* Decorative steps */}
                    {['Create your account', 'Verify your email', 'Start exploring events'].map((step, i) => (
                        <motion.div
                            key={i}
                            className="flex items-center gap-3 mb-4"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 + i * 0.15 }}
                        >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #6366F1, #8B5CF6)' }}>
                                {i + 1}
                            </div>
                            <span className="text-slate-400 text-sm">{step}</span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div className="flex flex-col justify-center w-full lg:w-3/5 p-6 sm:p-10 overflow-y-auto">
                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-2 mb-6">
                    <img src="/gmu-logo.png" alt="GMU Logo" className="h-9 w-auto object-contain" />
                    <span className="text-xl font-bold text-white">GM University</span>
                </div>

                <motion.div
                    className="w-full max-w-xl mx-auto"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7 }}
                >
                    <div className="glass-card-strong p-8 md:p-10">
                        <div className="mb-7">
                            <h2 className="text-2xl font-bold text-white mb-1">Create Account</h2>
                            <p className="text-slate-400 text-sm">Already have an account? <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Sign In</Link></p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
                            >
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* Row 1: Name + Email */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-dark">Full Name</label>
                                    <div className="relative">
                                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        <input name="name" type="text" required className="input-dark input-dark-icon" placeholder="Your full name" value={formData.name} onChange={handleChange} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label-dark">Email Address</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        <input name="email" type="email" required className="input-dark input-dark-icon" placeholder="you@college.edu" value={formData.email} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Row 2: USN + Phone */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-dark">USN</label>
                                    <div className="relative">
                                        <Hash className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        <input name="usn" type="text" required className="input-dark input-dark-icon" placeholder="e.g. 1RV19CS001" value={formData.usn} onChange={handleChange} />
                                    </div>
                                </div>
                                <div>
                                    <label className="label-dark">Phone Number</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        <input name="phone" type="tel" className="input-dark input-dark-icon" placeholder="10-digit number" value={formData.phone} onChange={handleChange} />
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Branch + Year */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="label-dark">Branch</label>
                                    <div className="relative">
                                        <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                                        <select name="branch" className="select-dark input-dark-icon" style={{ colorScheme: 'dark' }} value={formData.branch} onChange={handleChange} required>
                                            <option value="" disabled hidden>Select Branch</option>
                                            <option value="Computer Science">Computer Science</option>
                                            <option value="Information Science">Information Science</option>
                                            <option value="Electronics">Electronics</option>
                                            <option value="Mechanical">Mechanical</option>
                                            <option value="Civil">Civil</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="label-dark">Year</label>
                                    <div className="relative">
                                        <GraduationCap className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none z-10" />
                                        <select name="year" className="select-dark input-dark-icon" style={{ colorScheme: 'dark' }} value={formData.year} onChange={handleChange} required>
                                            <option value="" disabled hidden>Select Year</option>
                                            <option value="1st Year">1st Year</option>
                                            <option value="2nd Year">2nd Year</option>
                                            <option value="3rd Year">3rd Year</option>
                                            <option value="4th Year">4th Year</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <label className="label-dark">Password</label>
                                <div className="relative">
                                    <input
                                        name="password" type={showPassword ? 'text' : 'password'} required
                                        className="input-dark pr-11" placeholder="Create a strong password"
                                        value={formData.password} onChange={handleChange}
                                    />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors">
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <motion.button
                                type="submit"
                                disabled={loading}
                                className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                {loading ? (
                                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>Create Account <ArrowRight className="w-4 h-4" /></>
                                )}
                            </motion.button>
                        </form>
                    </div>
                </motion.div>

                <div className="mt-6 text-center text-xs text-slate-600">
                    © 2024 GM University. All Rights Reserved.
                </div>
            </div>
        </div>
    );
};

export default Register;
