/**
 * mockClientDB.js
 * Local client database using localStorage.
 * Simulates client registration, login, and profile management.
 * CI is the unique identifier (no duplicates allowed).
 */

const STORAGE_KEY = 'tbb_clientes';

// ── Helpers ──────────────────────────────────────────

const leerClientes = () => {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
        return [];
    }
};

const guardarClientes = (clientes) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clientes));
};

// ── Age Validation ───────────────────────────────────

/**
 * Calculates age from a date string (YYYY-MM-DD).
 * @returns {number} Age in years
 */
export const calcularEdad = (fechaNacimiento) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = nacimiento.getMonth();

    if (mesActual < mesNacimiento || (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad;
};

/**
 * @returns {boolean} true if age >= 18
 */
export const esMayorDeEdad = (fechaNacimiento) => {
    return calcularEdad(fechaNacimiento) >= 18;
};

// ── CRUD ──────────────────────────────────────────────

/**
 * Check if a CI is already registered.
 */
export const existeCI = (ci) => {
    const clientes = leerClientes();
    return clientes.some(c => c.ci === ci);
};

/**
 * Register a new client. Returns { exito, cliente?, error? }
 */
export const registrarCliente = ({
    nombreCompleto,
    ci,
    telefono,
    email,
    password,
    fechaNacimiento,
    fotoPerfil,       // base64 string or filename
    ciAnverso,        // base64 string or filename
    ciReverso,        // base64 string or filename
}) => {
    // Validate required fields
    if (!nombreCompleto || !ci || !password || !fechaNacimiento) {
        return { exito: false, error: 'Campos obligatorios incompletos.' };
    }

    // Validate age
    if (!esMayorDeEdad(fechaNacimiento)) {
        return { exito: false, error: 'Debe ser mayor de 18 años para registrarse.' };
    }

    // Check CI uniqueness
    if (existeCI(ci)) {
        return { exito: false, error: 'Este número de CI ya está registrado.' };
    }

    const clientes = leerClientes();
    const nuevoCliente = {
        id: 'cli-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4),
        nombreCompleto,
        ci,
        telefono: telefono || '',
        email: email || '',
        password, // In production this would be hashed!
        fechaNacimiento,
        fotoPerfil: fotoPerfil || null,
        ciAnverso: ciAnverso || null,
        ciReverso: ciReverso || null,
        rol: 'cliente',
        creadoEn: new Date().toISOString(),
    };

    clientes.push(nuevoCliente);
    guardarClientes(clientes);

    // Return without password for security
    const { password: _, ...perfilSeguro } = nuevoCliente;
    return { exito: true, cliente: perfilSeguro };
};

/**
 * Login client by CI + password. Returns { exito, cliente?, error? }
 */
export const loginCliente = (ci, password) => {
    const clientes = leerClientes();
    const encontrado = clientes.find(c => c.ci === ci);

    if (!encontrado) {
        return { exito: false, error: 'CI no encontrado. ¿Ya te registraste?' };
    }

    if (encontrado.password !== password) {
        return { exito: false, error: 'Contraseña incorrecta.' };
    }

    const { password: _, ...perfilSeguro } = encontrado;
    return { exito: true, cliente: perfilSeguro };
};

/**
 * Get client profile by CI (without password).
 */
export const obtenerCliente = (ci) => {
    const clientes = leerClientes();
    const encontrado = clientes.find(c => c.ci === ci);
    if (!encontrado) return null;
    const { password: _, ...perfilSeguro } = encontrado;
    return perfilSeguro;
};

export default {
    calcularEdad,
    esMayorDeEdad,
    existeCI,
    registrarCliente,
    loginCliente,
    obtenerCliente,
};
