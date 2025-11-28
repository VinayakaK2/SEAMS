import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { User, Lock } from 'lucide-react';

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
            {/* Left Side - Illustration & Welcome */}
            <div className="hidden w-1/2 bg-gradient-to-br from-blue-300 to-purple-400 lg:flex flex-col justify-center items-center p-12 relative overflow-hidden">
                <div className="z-10 text-center">
                    <h1 className="mb-4 text-4xl font-bold text-white">Welcome to the Student Hub</h1>
                    <p className="mb-8 text-lg text-blue-50">Connect, Participate, and Grow with SEAMS.</p>

                    {/* Illustration Placeholder */}
                    <div className="relative w-full max-w-md mx-auto mt-8">
                        <img
                            src="/student_hub_illustration.png"
                            alt="Student Hub Illustration"
                            className="object-contain w-full h-auto rounded-lg mix-blend-multiply opacity-90"
                        />
                    </div>
                </div>

                {/* Decorative Circles */}
                <div className="absolute top-0 left-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500 opacity-10 rounded-full translate-x-1/3 translate-y-1/3"></div>
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
