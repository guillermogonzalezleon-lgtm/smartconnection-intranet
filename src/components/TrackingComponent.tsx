import React, { useState, useEffect } from 'react';
import axios from 'axios';

const TrackingComponent = () => {
    const [trackingId, setTrackingId] = useState('');
    const [trackingData, setTrackingData] = useState({});

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        const response = await axios.get(`/trackAndTrace?trackingId=${trackingId}`);
        setTrackingData(response.data);
    };

    return (
        <div>
            <h1>Seguimiento de pedidos</h1>
            <form onSubmit={handleSubmit}>
                <label>Ingrese el número de seguimiento:</label>
                <input type="text" value={trackingId} onChange={(event) => setTrackingId(event.target.value)} />
                <button type="submit">Buscar</button>
            </form>
            {trackingData && (
                <div>
                    <h2>Resultado del seguimiento</h2>
                    <p>Estado: {trackingData.status}</p>
                    <p>Ubicación: {trackingData.location}</p>
                </div>
            )}
        </div>
    );
};

export default TrackingComponent;