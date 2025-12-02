import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import AuthContext from './AuthContext';
import API_URL from '../config/api';

const SocketContext = createContext();

export const useSocket = () => {
    return useContext(SocketContext);
};

export const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        const newSocket = io(API_URL || window.location.origin);
        setSocket(newSocket);

        newSocket.on('connect', () => {
            console.log('Connected to Socket.io server');

            // Join rooms based on user role
            if (user) {
                newSocket.emit('join_rooms', {
                    userId: user._id,
                    role: user.role
                });
            }
        });

        newSocket.on('rooms_joined', (data) => {
            if (data.success) {
                console.log('Successfully joined rooms');
            } else {
                console.error('Failed to join rooms:', data.error);
            }
        });

        newSocket.on('disconnect', () => {
            console.log('Disconnected from Socket.io server');
        });

        return () => newSocket.close();
    }, [user]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};
