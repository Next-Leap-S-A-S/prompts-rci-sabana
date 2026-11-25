/* Opciones del selector en cascada. Seis áreas del derecho colombiano para la clase de IA para abogados. */
window.AREAS = [
  { id: "civil", nombre: "Civil, procesal y familia", sub: ["Procesal civil y CGP", "Responsabilidad civil", "Obligaciones y contratos civiles", "Bienes y propiedad inmobiliaria", "Familia", "Sucesiones"] },
  { id: "comercial", nombre: "Comercial, societario y consumo", sub: ["Sociedades y gobierno corporativo", "Contratos comerciales", "Derecho del consumidor", "Libre competencia y publicidad", "Insolvencia empresarial", "Títulos valores y garantías mobiliarias"] },
  { id: "laboral", nombre: "Laboral y seguridad social", sub: ["Contrato individual y terminación", "Seguridad social y pensiones", "Derecho colectivo", "Riesgos laborales y SST", "Acoso laboral y convivencia", "Proceso laboral"] },
  { id: "penal", nombre: "Penal", sub: ["Proceso penal acusatorio", "Delitos contra el patrimonio y económicos", "Delitos contra la administración pública", "Víctimas y reparación", "Responsabilidad penal de adolescentes y violencia intrafamiliar"] },
  { id: "administrativo", nombre: "Administrativo y contratación estatal", sub: ["Medios de control (CPACA)", "Contratación estatal", "Función pública", "Derecho disciplinario", "Derecho de petición y silencio administrativo", "Urbanismo y servicios públicos"] },
  { id: "constitucional", nombre: "Constitucional y derechos humanos", sub: ["Acción de tutela", "Control de constitucionalidad", "Acciones populares y de grupo", "Acción de cumplimiento y habeas data", "Comunidades étnicas y campesinas"] },
];
window.ROLES = ["Litigante", "Asesor o consultor externo", "Abogado in-house", "Servidor público o juez", "Docente o investigador", "Estudiante o abogado en formación"];
window.ENFOQUES = ["Litigio y defensa", "Asesoría preventiva", "Conceptos y consultoría", "Negociación y conciliación", "Cumplimiento y gestión de riesgo", "Contratación y estructuración", "Investigación y docencia", "Función pública y decisión"];
window.JURISDICCIONES = ["Colombia", "Colombia y Comunidad Andina", "Colombia e internacional"];
window.NIVELES = ["Primera vez con IA", "La uso a veces", "La uso a diario"];
window.TONOS = ["Formal de escrito judicial", "Técnico y sobrio", "Claro para el cliente", "Directo y breve"];
window.TAREAS = [
  { id: "analizar", nombre: "Analizar casos y documentos", d: "Hechos, problema jurídico, riesgos." },
  { id: "redactar", nombre: "Redactar y mejorar escritos", d: "Demandas, recursos, conceptos, contratos." },
  { id: "investigar", nombre: "Investigar y verificar", d: "Normas, líneas y control de lo que dice la IA." },
  { id: "revisar", nombre: "Revisar y resumir", d: "Contratos y expedientes largos con alertas." },
  { id: "estrategia", nombre: "Estrategia y teoría del caso", d: "Escenarios y contraargumentos." },
  { id: "preparar", nombre: "Preparar audiencias y negociaciones", d: "Guion, preguntas, objeciones." },
  { id: "comunicar", nombre: "Comunicar con clientes", d: "Informes y respuestas difíciles." },
  { id: "gestionar", nombre: "Gestionar el despacho", d: "Términos, cronogramas, control de calidad." },
];
