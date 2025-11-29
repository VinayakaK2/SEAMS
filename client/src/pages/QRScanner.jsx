import { useState, useEffect, useContext } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import StudentLayout from '../components/StudentLayout';
import { Camera, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

const QRScanner = () => {
    const { user } = useContext(AuthContext);
    const [scanResult, setScanResult] = useState(null);
    const [message, setMessage] = useState('');
    const [isSuccess, setIsSuccess] = useState(false);
    const [scanner, setScanner] = useState(null);

    useEffect(() => {
        // Initialize scanner
        const html5QrcodeScanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        html5QrcodeScanner.render(onScanSuccess, onScanFailure);
        setScanner(html5QrcodeScanner);

        return () => {
            html5QrcodeScanner.clear().catch(error => console.error("Failed to clear scanner", error));
        };
    }, []);

    const onScanSuccess = async (decodedText, decodedResult) => {
        if (scanResult) return; // Prevent multiple scans

        setScanResult(decodedText);

        // Stop scanning temporarily
        if (scanner) {
            scanner.pause();
        }

        try {
            const token = localStorage.getItem('token');
            // Assuming the QR code contains the event ID or a specific verification URL
            // If decodedText is a URL, extract ID, otherwise assume it's the ID
            // For this system, let's assume QR contains: { "eventId": "...", "type": "attendance" } or just eventId

            let eventId = decodedText;
            try {
                const parsed = JSON.parse(decodedText);
                if (parsed.eventId) eventId = parsed.eventId;
            } catch (e) {
                // Not JSON, treat as raw string ID
            }

            const { data } = await axios.post('http://localhost:5000/api/registrations/verify-self',
                { eventId, qrData: decodedText },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setMessage(data.message || 'Attendance marked successfully!');
            setIsSuccess(true);
        } catch (error) {
            setMessage(error.response?.data?.message || 'Verification failed. Invalid QR code.');
            setIsSuccess(false);
        }
    };

    const onScanFailure = (error) => {
        // console.warn(`Code scan error = ${error}`);
    };

    const resetScanner = () => {
        setScanResult(null);
        setMessage('');
        setIsSuccess(false);
        if (scanner) {
            scanner.resume();
        } else {
            window.location.reload(); // Fallback if resume fails
        }
    };

    return (
        <StudentLayout user={user} title="Scan QR Code">
            <div className="max-w-md mx-auto">
                <div className="bg-white p-6 rounded-3xl shadow-xl border border-gray-100">
                    {!scanResult ? (
                        <div className="space-y-6">
                            <div className="text-center">
                                <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Camera className="w-8 h-8 text-blue-600" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Scan Event QR</h3>
                                <p className="text-gray-500 mt-2">Point your camera at the event QR code to mark your attendance.</p>
                            </div>

                            <div className="overflow-hidden rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 relative">
                                <div id="reader" className="w-full"></div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}>
                                {isSuccess ? (
                                    <CheckCircle className="w-10 h-10 text-green-600" />
                                ) : (
                                    <XCircle className="w-10 h-10 text-red-600" />
                                )}
                            </div>

                            <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                {isSuccess ? 'Success!' : 'Failed'}
                            </h3>
                            <p className={`text-lg mb-8 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
                                {message}
                            </p>

                            <button
                                onClick={resetScanner}
                                className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center"
                            >
                                <RefreshCw className="w-5 h-5 mr-2" />
                                Scan Another
                            </button>
                        </div>
                    )}
                </div>

                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        Having trouble? Make sure you have granted camera permissions.
                    </p>
                </div>
            </div>
        </StudentLayout>
    );
};

export default QRScanner;
