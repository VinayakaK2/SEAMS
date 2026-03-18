import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { User, Lock, ArrowRight, Sparkles, Trophy, Calendar, Star } from 'lucide-react';
import { motion } from 'framer-motion';

const features = [
    { icon: Calendar, text: 'Discover & register for campus events instantly' },
    { icon: Trophy, text: 'Earn points and climb the leaderboard' },
    { icon: Star, text: 'Build your verified campus profile' },
];

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const result = await login(email, password);
        setLoading(false);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="flex min-h-screen page-bg overflow-hidden">
            {/* ─── LEFT PANEL ─── */}
            <div className="hidden lg:flex w-1/2 relative flex-col justify-center items-center p-14 overflow-hidden">
                {/* Ambient blobs */}
                <div className="ambient-blob w-80 h-80 bg-indigo-600/25 top-[-5%] left-[-10%] animate-blob" />
                <div className="ambient-blob w-96 h-96 bg-purple-600/20 bottom-[5%] right-[-15%] animate-blob-2" />
                <div className="ambient-blob w-64 h-64 bg-sky-500/15 top-[40%] left-[20%] animate-blob-3" />

                {/* Subtle grid overlay */}
                <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%236366F1%22 fill-opacity=%220.04%22%3E%3Cpath d=%22M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />

                {/* Content */}
                <motion.div
                    className="relative z-10 max-w-md"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    {/* Logo */}
                    <div className="flex items-center gap-3 mb-10">
                        <img src="/gmu-logo.png" alt="GMU Logo" className="h-12 w-auto object-contain" />
                        <span className="text-2xl font-bold text-white tracking-tight">GM University</span>
                    </div>

                    <h1 className="text-5xl font-extrabold text-white leading-tight mb-4">
                        Welcome <br />
                        <span className="gradient-text">Back.</span>
                    </h1>
                    <p className="text-slate-400 text-lg mb-10 leading-relaxed">
                        Track events, earn points, and build your campus profile — all in one place.
                    </p>

                    {/* Feature highlights */}
                    <div className="space-y-4">
                        {features.map((f, i) => (
                            <motion.div
                                key={i}
                                className="flex items-center gap-4 group"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all group-hover:scale-110"
                                    style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)' }}>
                                    <f.icon className="w-5 h-5 text-indigo-400" />
                                </div>
                                <span className="text-slate-300 text-sm leading-snug">{f.text}</span>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>

            {/* ─── RIGHT PANEL ─── */}
            <div className="flex flex-col justify-center items-center w-full lg:w-1/2 p-6 sm:p-12 md:p-16 min-h-screen relative">
                {/* Mobile logo */}
                <div className="flex lg:hidden items-center gap-2 mb-8">
                    <img src="/gmu-logo.png" alt="GMU Logo" className="h-9 w-auto object-contain" />
                    <span className="text-xl font-bold text-white">GM University</span>
                </div>

                <motion.div
                    className="w-full max-w-md mx-auto"
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, ease: 'easeOut' }}
                >
                    <div className="glass-card-strong p-8 md:p-10">
                        <div className="mb-8">
                            <h2 className="text-3xl font-bold text-white mb-1">Sign In</h2>
                            <p className="text-slate-400 text-sm">Don't have an account? <Link to="/register" className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors">Create one</Link></p>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-6 px-4 py-3 rounded-xl text-sm font-medium"
                                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}
                            >
                                {error}
                            </motion.div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* Email */}
                            <div>
                                <label className="label-dark">Email or USN</label>
                                <div className="relative">
                                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                    <input
                                        type="text"
                                        className="input-dark input-dark-icon"
                                        placeholder="Enter your email or USN"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="label-dark mb-0">Password</label>
                                    <Link to="/forgot-password" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium">
                                        Forgot Password?
                                    </Link>
                                </div>
                                <div className="relative">
                                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                    <input
                                        type="password"
                                        className="input-dark input-dark-icon"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Submit */}
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
                                    <>
                                        Sign In
                                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                    </>
                                )}
                            </motion.button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-xs text-slate-500">
                                By signing in, you agree to our{' '}
                                <span className="text-slate-400 hover:text-indigo-400 cursor-pointer transition-colors">Terms of Service</span>
                            </p>
                        </div>
                    </div>
                </motion.div>

                <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-medium text-slate-500">
                    <p>© 2024 GM University. All Rights Reserved.</p>
                    <div className="flex items-center gap-4">
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
