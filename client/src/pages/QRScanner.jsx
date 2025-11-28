import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import axios from 'axios';

const QRScanner = () => {
    const [scanResult, setScanResult] = useState(null);
    const [manualCode, setManualCode] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        function onScanSuccess(decodedText, decodedResult) {
            setScanResult(decodedText);
            verifyAttendance(decodedText);
            scanner.clear();
        }

        function onScanFailure(error) {
            // handle scan failure, usually better to ignore and keep scanning.
        }

        return () => {
            scanner.clear().catch(error => console.error("Failed to clear scanner. ", error));
        };
    }, []);

    const verifyAttendance = async (qrToken) => {
        try {
            const token = localStorage.getItem('token');
            // We need studentId. In a real scenario, the student scans their ID, or the coordinator scans the student's QR?
            // The requirement says "QR Attendance Scanner Page".
            // Usually: Event has a QR, Student scans it -> Student gets credit.
            // OR: Student has a QR, Coordinator scans it -> Student gets credit.
            // The user said: "Generate unique time-bound QR code (valid during event)" (Coordinator creates event).
            // So Coordinator generates QR for Event. Student scans it.
            // Wait, "Verify participation: Table with student name... scan timestamp... Approve/Reject".
            // This implies Coordinator verifies.
            // "QR Attendance Scanner Page (mobile friendly)" - likely for students to scan the event QR?
            // OR Coordinator scans Student QR?
            // "Generate unique time-bound QR code (valid during event)" -> This is for the Event.
            // So the Event has a QR code.
            // Students scan it to mark their attendance?
            // If Student scans Event QR, then Student's phone sends request "I am at Event X".
            // Then Coordinator sees "Student Y claims to be at Event X" and approves?
            // OR if the QR is time-bound and unique, maybe scanning it IS the verification?

            // Let's assume: Coordinator projects Event QR. Student scans it.
            // Student's app sends: POST /api/registrations/verify { qrToken: "event-token" }
            // But `verifyAttendance` controller I wrote expects `studentId` and `qrToken`.
            // And it says `access Private (Coordinator, Faculty)`.
            // So my controller was designed for Coordinator scanning Student?
            // "Verify participation: Table with student name...".

            // Let's re-read: "Generate unique time-bound QR code (valid during event)" -> Event Coordinator Module.
            // "QR Attendance Scanner Page (mobile friendly)" -> Student Module.
            // So Student scans Event QR.

            // So I need to update `verifyAttendance` to be accessible by Student?
            // OR `verifyAttendance` is for Coordinator to manually verify?

            // If Student scans Event QR:
            // Student sends `qrToken`. Backend verifies token is valid for an event.
            // Backend marks Student as "attended".

            // I will update `verifyAttendance` to allow Students to self-verify if they scan the valid Event QR.
            // OR I'll create a new endpoint `markAttendance` for students.

            // Let's use the existing `verifyAttendance` but modify it or create a wrapper.
            // Actually, if the QR is time-bound and unique to the event, it's safe for students to scan it to prove presence.

            // I'll assume Student scans Event QR.

            const { data } = await axios.post('http://localhost:5000/api/registrations/verify-self', { qrToken }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessage(`Success: ${data.message}`);
        } catch (error) {
            setMessage(`Error: ${error.response?.data?.message || 'Verification failed'}`);
        }
    };

    const handleManualSubmit = (e) => {
        e.preventDefault();
        verifyAttendance(manualCode);
    };

    return (
        <div className="min-h-screen p-8 bg-gray-50">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow">
                <div className="p-6">
                    <h2 className="mb-4 text-2xl font-bold text-center text-gray-800">Scan Event QR</h2>
                    <div id="reader" width="300px"></div>

                    <div className="mt-6">
                        <p className="mb-2 text-center text-gray-600">Or enter code manually:</p>
                        <form onSubmit={handleManualSubmit} className="flex gap-2">
                            <input
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded"
                                placeholder="Event Code"
                            />
                            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700">Verify</button>
                        </form>
                    </div>

                    {message && (
                        <div className={`mt-4 p-3 rounded text-center ${message.startsWith('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {message}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default QRScanner;
