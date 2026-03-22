import React, { useEffect, useState } from 'react';

interface HotjarDashboardProps {
  // No hay props necesarios para este componente
}

const HotjarDashboard: React.FC<HotjarDashboardProps> = () => {
  const [hotjarLoaded, setHotjarLoaded] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://static.hotjar.com/c/hotjar-'.concat('ID_DE_HOTJAR', '.js?sv=');
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      setHotjarLoaded(true);
    };
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }}>
      {hotjarLoaded ? (
        <iframe
          src={`https://app.hotjar.com/dashboard/${'ID_DE_HOTJAR'}`}
          frameBorder="0"
          width="100%"
          height="100%"
          style={{
            border: 'none',
          }}
        />
      ) : (
        <p>Cargando Hotjar...</p>
      )}
    </div>
  );
};

export default HotjarDashboard;