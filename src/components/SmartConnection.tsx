import React, { useState, useEffect } from 'react';

interface SmartConnectionProps {
  dispositivo: string;
  red: string;
}

const SmartConnection: React.FC<SmartConnectionProps> = ({ dispositivo, red }) => {
  const [estadoConexión, setEstadoConexión] = useState(false);

  useEffect(() => {
    conectarDispositivo();
  }, [dispositivo, red]);

  const conectarDispositivo = async () => {
    try {
      // Lógica para conectar el dispositivo a la red
      console.log(`Conectando dispositivo ${dispositivo} a la red ${red}`);
      setEstadoConexión(true);
    } catch (error) {
      console.error(`Error al conectar dispositivo: ${error}`);
    }
  };

  const desconectarDispositivo = async () => {
    try {
      // Lógica para desconectar el dispositivo de la red
      console.log(`Desconectando dispositivo ${dispositivo} de la red ${red}`);
      setEstadoConexión(false);
    } catch (error) {
      console.error(`Error al desconectar dispositivo: ${error}`);
    }
  };

  return (
    <div>
      <h2>Estado de conexión: {estadoConexión ? 'Conectado' : 'Desconectado'}</h2>
      <button onClick={conectarDispositivo}>Conectar</button>
      <button onClick={desconectarDispositivo}>Desconectar</button>
    </div>
  );
};

export default SmartConnection;