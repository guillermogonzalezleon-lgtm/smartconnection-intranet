import React, { useState, useEffect } from 'react';
import { Socket } from 'socket.io-client';

interface SmartConnectionProps {
  deviceId: string;
  devicePassword: string;
}

const SmartConnectionComponent: React.FC<SmartConnectionProps> = ({ deviceId, devicePassword }) => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const connect = async () => {
      try {
        const socket = new Socket('https://example.com');
        await socket.emit('connect', { deviceId, devicePassword });
        setConnected(true);
      } catch (error) {
        console.error(error);
      }
    };
    connect();
  }, [deviceId, devicePassword]);

  return (
    <div>
      {connected ? (
        <p>Conectado con éxito</p>
      ) : (
        <p>No conectado</p>
      )}
    </div>
  );
};