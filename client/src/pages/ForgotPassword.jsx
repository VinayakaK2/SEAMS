import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import axios from 'axios';
import API_URL from '../config/api';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await axios.post(`${API_URL}/api/auth/forgotpassword`, { email });
            setSubmitted(true);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send reset email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen page-bg flex flex-col justify-center items-center p-6 relative overflow-hidden">
            {/* Ambient blobs */}
            <div className="ambient-blob w-96 h-96 bg-indigo-600/20 top-[-10%] left-[-10%] animate-blob" />
            <div className="ambient-blob w-80 h-80 bg-purple-600/15 bottom-[0%] right-[-10%] animate-blob-2" />

            {/* Logo */}
            <motion.div
                className="flex items-center gap-3 mb-8"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <img src="/gmu-logo.png" alt="GMU Logo" className="h-10 w-auto object-contain" />
                <span className="text-xl font-bold text-white">GM University</span>
            </motion.div>

            <motion.div
                className="w-full max-w-md"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7 }}
            >
                <div className="glass-card-strong p-8 md:p-10">
                    {!submitted ? (
                        <>
                            <div className="mb-7">
                                <h2 className="text-2xl font-bold text-white mb-2">Forgot Password?</h2>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Enter the email associated with your account and we'll send you a reset link.
                                </p>
                            </div>

                            {error && (
                                <div className="mb-5 px-4 py-3 rounded-xl text-sm font-medium"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#FCA5A5' }}>
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <div>
                                    <label className="label-dark">Email Address / USN</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                                        <input
                                            type="text"
                                            required
                                            className="input-dark input-dark-icon"
                                            placeholder="yourname@university.edu or USN"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <motion.button
                                    type="submit"
                                    disabled={loading}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                    whileHover={{ scale: 1.01 }}
                                    whileTap={{ scale: 0.98 }}
                                >
                                    {loading ? (
                                        <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Send Reset Link <ArrowRight className="w-4 h-4" /></>
                                    )}
                                </motion.button>
                            </form>
                        </>
                    ) : (
                        <motion.div
                            className="text-center py-4"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}>
                                <CheckCircle className="w-8 h-8 text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Reset Link Sent!</h3>
                            <p className="text-slate-400 text-sm">
                                Check your email for instructions to reset your password.
                            </p>
                        </motion.div>
                    )}

                    <div className="mt-6 pt-5 border-t text-center" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-indigo-400 transition-colors font-medium">
                            <ArrowLeft className="w-4 h-4" /> Back to Sign In
                        </Link>
                    </div>
                </div>
            </motion.div>

            <div className="mt-8 text-center text-xs text-slate-600">
                © 2024 GM University. All Rights Reserved.
            </div>
        </div>
    );
};

export default ForgotPassword;
