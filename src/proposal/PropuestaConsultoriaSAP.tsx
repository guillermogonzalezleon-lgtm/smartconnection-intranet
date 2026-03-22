// Propuesta de Consultoría SAP para Cliente PYME Chileno

interface Propuesta {
  scope: string;
  timeline: string;
  pricingEstimado: string;
  beneficios: string[];
}

const propuesta: Propuesta = {
  scope: "Implantación y configuración del sistema SAP para gestionar procesos de negocio",
  timeline: "12 semanas",
  pricingEstimado: "$150.000",
  beneficios: [
    "Mejora en la eficiencia y productividad",
    "Reducción de costos y aumento de la rentabilidad",
    "Acceso a información en tiempo real para tomar decisiones informadas",
    "Cumplimiento de normas y regulaciones",
  ],
};

export default propuesta;