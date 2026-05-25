// [Académico] Sprint 5 - Feature flag: true = localStorage mock, false = backend REST
export const USE_MOCK_DATA = true;
// gemini: Se comentó la línea original de Claude para que no se pierda.
// export const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

// gemini: Se agregó la detección automática de hostname para permitir peticiones desde el celular en la misma red local (ej. 192.168.x.x)
const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
export const API_BASE = process.env.REACT_APP_API_URL || `http://${currentHost}:4000/api`;
