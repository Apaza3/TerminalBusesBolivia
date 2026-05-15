/**
 * mockAuthDB.js
 * Base de datos local de autenticación para todos los roles del sistema.
 * Roles: admin_sucursal, cajero, conductor, cliente
 */

const STORAGE_KEY = 'tbb_staff_users';

const STAFF_DEFAULT = [
    {
        id: 'staff-001',
        email: 'admin@tbb.com',
        password: 'admin123456',
        rol: 'admin_sucursal',
        nombre_completo: 'Admin Principal',
        ci: '1000000',
        telefono: '70000001',
        sucursal_id: 'demo-s1',
        departamento: 'La Paz',
        activo: true,
        creadoEn: '2026-01-01T00:00:00.000Z',
    },
    {
        id: 'staff-002',
        email: 'cajero@tbb.com',
        password: 'cajero123456',
        rol: 'cajero',
        nombre_completo: 'María Cajero',
        ci: '2000000',
        telefono: '70000002',
        sucursal_id: 'demo-s1',
        departamento: 'La Paz',
        activo: true,
        creadoEn: '2026-01-01T00:00:00.000Z',
    },
    {
        id: 'staff-003',
        email: 'conductor@tbb.com',
        password: 'conductor123456',
        rol: 'conductor',
        nombre_completo: 'Pedro Chofer',
        ci: '3000000',
        telefono: '70000003',
        sucursal_id: 'demo-s1',
        departamento: 'La Paz',
        activo: true,
        creadoEn: '2026-01-01T00:00:00.000Z',
    },
];

const leerStaff = () => {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!data || data.length === 0) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(STAFF_DEFAULT));
            return STAFF_DEFAULT;
        }
        // Merge defaults si no existen
        let modificado = false;
        STAFF_DEFAULT.forEach(def => {
            if (!data.find(u => u.id === def.id)) {
                data.push(def);
                modificado = true;
            }
        });
        if (modificado) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        return data;
    } catch {
        return STAFF_DEFAULT;
    }
};

const guardarStaff = (usuarios) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(usuarios));
};

export const inicializarStaff = () => {
    leerStaff(); // triggers merge/init
};

/**
 * Login de staff (admin, cajero, conductor) por email + password.
 */
export const loginStaff = (email, password) => {
    const usuarios = leerStaff();
    const encontrado = usuarios.find(u => u.email === email.toLowerCase().trim());

    if (!encontrado) return { exito: false, error: 'Correo no registrado.' };
    if (!encontrado.activo) return { exito: false, error: 'Esta cuenta está suspendida.' };
    if (encontrado.password !== password) return { exito: false, error: 'Contraseña incorrecta.' };

    const { password: _, ...perfilSeguro } = encontrado;
    return { exito: true, usuario: perfilSeguro };
};

export const obtenerTodosStaff = () => {
    return leerStaff().map(({ password: _, ...u }) => u);
};

export const registrarStaff = ({ email, password, rol, nombre_completo, ci, telefono, sucursal_id }) => {
    const usuarios = leerStaff();

    if (usuarios.find(u => u.email === email.toLowerCase().trim())) {
        return { exito: false, error: 'El correo ya está registrado.' };
    }
    if (ci && usuarios.find(u => u.ci === ci)) {
        return { exito: false, error: 'El CI ya está registrado.' };
    }

    const nuevo = {
        id: 'staff-' + Date.now(),
        email: email.toLowerCase().trim(),
        password,
        rol,
        nombre_completo,
        ci: ci || '',
        telefono: telefono || '',
        sucursal_id: sucursal_id || null,
        activo: true,
        creadoEn: new Date().toISOString(),
    };

    usuarios.push(nuevo);
    guardarStaff(usuarios);

    const { password: _, ...perfilSeguro } = nuevo;
    return { exito: true, usuario: perfilSeguro };
};

export const cambiarEstadoCuenta = (userId, activo) => {
    const usuarios = leerStaff();
    const idx = usuarios.findIndex(u => u.id === userId);
    if (idx === -1) return { exito: false, error: 'Usuario no encontrado.' };
    if (usuarios[idx].id === 'staff-001') {
        return { exito: false, error: 'No se puede suspender al administrador principal.' };
    }
    usuarios[idx].activo = activo;
    guardarStaff(usuarios);
    return { exito: true };
};

export const actualizarPerfilStaff = (userId, { nombre_completo, telefono, departamento }) => {
    const usuarios = leerStaff();
    const idx = usuarios.findIndex(u => u.id === userId);
    if (idx === -1) return { exito: false, error: 'Usuario no encontrado.' };
    if (nombre_completo) usuarios[idx].nombre_completo = nombre_completo;
    if (telefono !== undefined) usuarios[idx].telefono = telefono;
    if (departamento) usuarios[idx].departamento = departamento;
    guardarStaff(usuarios);
    const { password: _, ...perfilSeguro } = usuarios[idx];
    return { exito: true, usuario: perfilSeguro };
};

export const existeEmailStaff = (email) => {
    const usuarios = leerStaff();
    return usuarios.some(u => u.email === email.toLowerCase().trim());
};

export default {
    inicializarStaff,
    loginStaff,
    obtenerTodosStaff,
    registrarStaff,
    cambiarEstadoCuenta,
    actualizarPerfilStaff,
    existeEmailStaff,
};
