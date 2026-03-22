// Resumen de la Propuesta de Consultoría SAP

import propuesta from "../proposal/PropuestaConsultoriaSAP";

const ResumenPropuesta = () => {
  return (
    <div>
      <h1>Resumen de la Propuesta</h1>
      <p>Alcance: {propuesta.scope}</p>
      <p>Tiempo estimado: {propuesta.timeline}</p>
      <p>Precio estimado: {propuesta.pricingEstimado}</p>
      <h2>Beneficios</h2>
      <ul>
        {propuesta.beneficios.map((beneficio, index) => (
          <li key={index}>{beneficio}</li>
        ))}
      </ul>
    </div>
  );
};

export default ResumenPropuesta;