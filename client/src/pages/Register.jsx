import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import { Eye, EyeOff, Layers } from 'lucide-react';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        usn: '',
        branch: 'Computer Science', // Default
        year: '1st Year', // Default
        phone: '',
        password: '',
        email: '' // Still needed for backend, maybe derive from USN or ask? 
        // The mock doesn't show Email field.
        // But backend requires Email.
        // Maybe "Email or USN" in login implies USN can be used for login?
        // But backend `loginUser` uses `findOne({ email })`.
        // So I MUST have an email.
        // I will add an Email field to the form, or derive it if possible (e.g. usn@college.edu).
        // The user said "create account ko bhi isstarah create karo" (make create account like this too).
        // The image DOES NOT show Email.
        // This is a gap.
        // I will add Email field to be safe, or I'll ask the user?
        // User said "isstarah" (like this).
        // If I omit Email, registration will fail.
        // I will add Email field. It's standard.
        // Or maybe the "USN" field in the image IS the identifier?
        // But backend `User` model has `email: { required: true }`.
        // I'll add Email field. It's better to be functional.
        // I'll place it after Name.
    });

    const [showPassword, setShowPassword] = useState(false);
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Map Year to Semester (approx)
        const semesterMap = {
            '1st Year': '1',
            '2nd Year': '3',
            '3rd Year': '5',
            '4th Year': '7'
        };

        const payload = {
            ...formData,
            semester: semesterMap[formData.year] || '1',
            role: 'student' // Default to student
        };

        const result = await register(payload);
        if (result.success) {
            // Show success message and redirect to login
            setError(''); // Clear any previous errors
            alert(result.message || 'Registration successful! Please check your email to verify your account.');
            navigate('/login');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-2xl shadow-xl">
                <div className="text-center">
                    <div className="mx-auto h-12 w-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                        <Layers className="h-8 w-8 text-indigo-600" />
                    </div>
                    <h2 className="text-3xl font-extrabold text-gray-900">SEAMS</h2>
                    <h3 className="mt-2 text-xl font-bold text-gray-900">Create an Account</h3>
                    <p className="mt-2 text-sm text-gray-600">
                        Track your activities and engagement across campus.
                    </p>
                </div>

                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">{error}</div>}

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                            <input
                                id="name"
                                name="name"
                                type="text"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your full name"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Added Email field because backend requires it */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="usn" className="block text-sm font-medium text-gray-700">USN (University Serial Number)</label>
                            <input
                                id="usn"
                                name="usn"
                                type="text"
                                required
                                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your USN"
                                value={formData.usn}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="branch" className="block text-sm font-medium text-gray-700">Branch</label>
                                <select
                                    id="branch"
                                    name="branch"
                                    className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
                                    value={formData.branch}
                                    onChange={handleChange}
                                >
                                    <option>Computer Science</option>
                                    <option>Information Science</option>
                                    <option>Electronics</option>
                                    <option>Mechanical</option>
                                    <option>Civil</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="year" className="block text-sm font-medium text-gray-700">Year</label>
                                <select
                                    id="year"
                                    name="year"
                                    className="mt-1 block w-full pl-3 pr-10 py-3 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg"
                                    value={formData.year}
                                    onChange={handleChange}
                                >
                                    <option>1st Year</option>
                                    <option>2nd Year</option>
                                    <option>3rd Year</option>
                                    <option>4th Year</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label>
                            <input
                                id="phone"
                                name="phone"
                                type="tel"
                                className="mt-1 appearance-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                                placeholder="Enter your phone number"
                                value={formData.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                            <div className="relative mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    className="appearance-none block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm pr-10"
                                    placeholder="Enter your password"
                                    value={formData.password}
                                    onChange={handleChange}
                                />
                                <button
                                    type="button"
                                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5 text-gray-400" /> : <Eye className="h-5 w-5 text-gray-400" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div>
                        <button
                            type="submit"
                            className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                        >
                            Create Account
                        </button>
                    </div>

                    <div className="text-center mt-4">
                        <p className="text-sm text-gray-600">
                            Already have an account? <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">Sign In</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
