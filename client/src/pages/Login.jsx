import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { User, Lock } from 'lucide-react';

import { motion } from 'framer-motion';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await login(email, password);
        if (result.success) {
            navigate('/');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="flex min-h-screen bg-white">
            {/* Left Side - Animated Background & Welcome */}
            <div className="hidden w-1/2 bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 lg:flex flex-col justify-center items-center p-12 relative overflow-hidden">
                {/* Animated Background Shapes */}
                <div className="absolute inset-0 w-full h-full overflow-hidden">
                    {/* Circle - Bright Cyan Glow */}
                    <motion.div
                        className="absolute top-[10%] left-[10%] w-40 h-40 rounded-full bg-gradient-to-br from-cyan-300 to-blue-500 opacity-60 blur-2xl"
                        animate={{
                            y: [0, -40, 0],
                            x: [0, 30, 0],
                            scale: [1, 1.2, 1],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />
                    <motion.div
                        className="absolute top-[10%] left-[10%] w-40 h-40 rounded-full bg-gradient-to-br from-cyan-200/30 to-blue-400/30 backdrop-blur-3xl border border-white/20 shadow-[0_0_40px_rgba(34,211,238,0.4)]"
                        animate={{
                            y: [0, -40, 0],
                            x: [0, 30, 0],
                            rotate: [0, 15, 0],
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                    />

                    {/* Pill - Vibrant Pink/Purple */}
                    <motion.div
                        className="absolute bottom-[15%] left-[5%] w-56 h-28 rounded-full bg-gradient-to-r from-fuchsia-500 to-pink-500 opacity-50 blur-2xl"
                        animate={{
                            y: [0, 50, 0],
                            rotate: [0, -15, 0],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5
                        }}
                    />
                    <motion.div
                        className="absolute bottom-[15%] left-[5%] w-56 h-28 rounded-full bg-gradient-to-r from-fuchsia-400/20 to-pink-400/20 backdrop-blur-2xl border border-white/20 shadow-[0_0_40px_rgba(232,121,249,0.3)]"
                        animate={{
                            y: [0, 50, 0],
                            rotate: [0, -15, 0],
                        }}
                        transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5
                        }}
                    />

                    {/* Soft Blob - Electric Indigo */}
                    <motion.div
                        className="absolute top-[35%] right-[10%] w-72 h-72 bg-gradient-to-tr from-indigo-500 to-violet-400 opacity-40 blur-[50px]"
                        animate={{
                            scale: [1, 1.3, 1],
                            rotate: [0, 180, 0],
                        }}
                        transition={{
                            duration: 7,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}
                    />
                    <motion.div
                        className="absolute top-[35%] right-[10%] w-64 h-64 bg-gradient-to-tr from-indigo-400/20 to-violet-300/20 backdrop-blur-xl border border-white/20 shadow-[0_0_50px_rgba(129,140,248,0.3)]"
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, 90, 0],
                        }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 1
                        }}
                        style={{ borderRadius: '50% 50% 50% 50% / 50% 50% 50% 50%' }}
                    />

                    {/* Rounded Square - White/Blue Glass */}
                    <motion.div
                        className="absolute top-[5%] right-[20%] w-20 h-20 rounded-3xl bg-gradient-to-bl from-white to-blue-200 opacity-60 blur-xl"
                        animate={{
                            y: [0, 30, 0],
                            rotate: [0, 90, 0],
                        }}
                        transition={{
                            duration: 4.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.2
                        }}
                    />
                    <motion.div
                        className="absolute top-[5%] right-[20%] w-20 h-20 rounded-3xl bg-gradient-to-bl from-white/30 to-blue-100/30 backdrop-blur-md border border-white/40 shadow-[0_0_30px_rgba(255,255,255,0.4)]"
                        animate={{
                            y: [0, 30, 0],
                            rotate: [0, 90, 0],
                        }}
                        transition={{
                            duration: 4.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.2
                        }}
                    />
                </div>

                {/* Content */}
                <div className="z-10 text-center relative">
                    <motion.div
                        className="mb-6 inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/30 shadow-2xl"
                        animate={{ y: [0, -10, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    >
                        <User className="w-12 h-12 text-white drop-shadow-md" />
                    </motion.div>
                    <h1 className="mb-4 text-6xl font-extrabold text-white drop-shadow-xl tracking-tight">
                        Welcome Back
                    </h1>
                    <p className="mb-8 text-xl text-blue-50/90 max-w-md mx-auto leading-relaxed font-medium drop-shadow-md">
                        Access your student portal to manage events, track participation, and grow with SEAMS.
                    </p>
                </div>

                {/* Overlay Gradient for depth */}
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/60 via-transparent to-blue-900/20 pointer-events-none"></div>
            </div>

            {/* Right Side - Login Form */}
            <div className="flex flex-col justify-center w-full p-8 lg:w-1/2 sm:p-12 md:p-16 lg:p-24 bg-gray-50">
                <div className="w-full max-w-md mx-auto">
                    <h2 className="mb-8 text-3xl font-bold text-gray-900">Sign In</h2>

                    {error && <div className="p-3 mb-6 text-sm text-red-700 bg-red-100 rounded-lg">{error}</div>}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Email or USN</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    className="w-full py-3 pl-10 pr-4 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                                    placeholder="Enter your email or USN"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block mb-2 text-sm font-medium text-gray-700">Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Lock className="w-5 h-5 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    className="w-full py-3 pl-10 pr-4 text-gray-700 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-colors"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <Link to="/forgot-password" className="text-sm font-medium text-blue-600 hover:text-blue-500">Forgot Password?</Link>
                        </div>

                        <button type="submit" className="w-full px-4 py-3 font-bold text-white transition bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                            Login
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-600">
                            Don't have an account? <Link to="/register" className="font-bold text-blue-600 hover:text-blue-500">Register</Link>
                        </p>
                    </div>
                </div>

                <div className="mt-auto pt-10 text-center text-xs text-gray-400">
                    &copy; 2024 SEAMS University. All Rights Reserved. | Help Center | Terms of Service
                </div>
            </div>
        </div>
    );
};

export default Login;
