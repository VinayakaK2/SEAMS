import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Mail, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import API_URL from '../config/api';

const VerifyEmail = () => {
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState('');

    const { verificationToken } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const verifyEmail = async () => {
            try {
                const { data } = await axios.get(`${API_URL}/api/auth/verifyemail/${verificationToken}`);

                // Check if backend says success
                if (data.success) {
                    setSuccess(true);
                    setError('');

                    // Redirect to login after 3 seconds
                    setTimeout(() => {
                        navigate('/login');
                    }, 3000);
                } else {
                    // Backend returned 200 but success: false
                    setSuccess(false);
                    setError(data.message || 'Verification failed');
                }
            } catch (err) {
                setSuccess(false);
                setError(err.response?.data?.message || 'Verification failed');
            } finally {
                setLoading(false);
            }
        };

        verifyEmail();
    }, [verificationToken, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
                <div className="text-center">
                    {loading && (
                        <>
                            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Loader className="w-8 h-8 text-blue-600 animate-spin" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Email...</h2>
                            <p className="text-gray-500">Please wait while we verify your email address.</p>
                        </>
                    )}

                    {!loading && success && (
                        <>
                            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle className="w-8 h-8 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Email Verified!</h2>
                            <p className="text-gray-600 mb-4">
                                Your email has been successfully verified.
                            </p>
                            <p className="text-gray-500 text-sm">
                                Redirecting to login page...
                            </p>
                        </>
                    )}

                    {!loading && error && (
                        <>
                            <div className="bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-2">Verification Failed</h2>
                            <p className="text-red-600 mb-4">{error}</p>
                            <button
                                onClick={() => navigate('/register')}
                                className="text-blue-600 hover:text-blue-700 font-semibold"
                            >
                                Register Again
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VerifyEmail;
