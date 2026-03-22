import React from 'react';
import { Link } from 'react-router-dom';

const Navbar: React.FC = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">SM Connection</Link>
      </div>
      <div className="navbar-menu">
        <Link to="/servicios">Servicios</Link>
        <Link to="/contacto">Contacto</Link>
      </div>
    </nav>
  );
};

export default Navbar;