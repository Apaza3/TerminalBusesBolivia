🚌 Flota y Personal - TerminalHub (Formato JSON para Claude Code)
🔐 Contraseña única (pruebas): TerminalHub2026!
📧 Dominio de correos: terminalhub.bo
📅 Fecha de generación: 2026-05-26
📋 Total: 98 buses · 98 conductores · 98 ayudantes · 196 cuentas de correo

🎯 Convenciones para Claude Code
convenciones:
  password_unica: "TerminalHub2026!"
  dominio_correo: "terminalhub.bo"
  formato_correo_conductor: "{nombre}.{apellido}.conductor.{empresa_codigo}.{departamento}@terminalhub.bo"
  formato_correo_ayudante: "{nombre}.{apellido}.ayudante.{empresa_codigo}.{departamento}@terminalhub.bo"
  formato_ci: "{numero_7_digitos} {letra_departamento}"
  letras_departamento:
    LP: "La Paz"
    CB: "Cochabamba"
    SC: "Santa Cruz"
    PT: "Potosí"
    CH: "Chuquisaca"
    OR: "Oruro"
    TJ: "Tarija"
    BE: "Beni"
  categorias_servicio:
    - "Estándar"
    - "Semicama"
    - "Cama"
    - "Cama Ejecutivo"
    - "Cama Suite"
  amenidades_disponibles:
    - "WiFi"
    - "Baño"
    - "TV"
    - "A/C"
    - "USB"
    - "Calefacción"
    - "Refrigerador"
    - "GPS"
    - "Cámaras"
    - "Servicio a bordo"
  roles: ["admin", "cajero", "conductor", "ayudante"]
  estados_bus: ["activo", "mantenimiento", "fuera_servicio"]

  📋 Schema sugerido para Supabase
  -- Tablas sugeridas (Claude Code puede adaptar):
-- empresas, terminales, buses, personal (conductores + ayudantes), asignaciones_bus_personal, credenciales

CREATE TYPE categoria_bus AS ENUM ('Estándar', 'Semicama', 'Cama', 'Cama Ejecutivo', 'Cama Suite');
CREATE TYPE rol_personal AS ENUM ('admin', 'cajero', 'conductor', 'ayudante');
CREATE TYPE estado_bus AS ENUM ('activo', 'mantenimiento', 'fuera_servicio');

CREATE TABLE empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL,
  codigo VARCHAR(5) UNIQUE NOT NULL
);

CREATE TABLE terminales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ciudad VARCHAR(50) NOT NULL,
  departamento VARCHAR(50) NOT NULL
);

CREATE TABLE buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  placa VARCHAR(10) UNIQUE NOT NULL,
  empresa_id UUID REFERENCES empresas(id),
  marca VARCHAR(50) NOT NULL,
  modelo VARCHAR(100) NOT NULL,
  anio_fabricacion INTEGER NOT NULL,
  pisos INTEGER NOT NULL DEFAULT 1,
  categoria categoria_bus NOT NULL,
  amenidades TEXT[] NOT NULL DEFAULT '{}',
  soat_numero VARCHAR(50),
  soat_vencimiento DATE,
  inspeccion_numero VARCHAR(50),
  inspeccion_vencimiento DATE,
  terminal_base_id UUID REFERENCES terminales(id),
  estado estado_bus DEFAULT 'activo'
);

CREATE TABLE personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ci VARCHAR(15) UNIQUE NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100) NOT NULL,
  rol rol_personal NOT NULL,
  correo VARCHAR(255) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  fecha_nacimiento DATE,
  licencia_tipo VARCHAR(10),
  empresa_id UUID REFERENCES empresas(id),
  terminal_base_id UUID REFERENCES terminales(id)
);

CREATE TABLE asignaciones_bus_personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID REFERENCES buses(id),
  conductor_id UUID REFERENCES personal(id),
  ayudante_id UUID REFERENCES personal(id),
  fecha_asignacion DATE DEFAULT CURRENT_DATE,
  UNIQUE(bus_id, fecha_asignacion)
);

CREATE TABLE credenciales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  personal_id UUID REFERENCES personal(id),
  correo VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  activo BOOLEAN DEFAULT true
);

📦 Dataset completo (JSON parseable)
{
  "metadata": {
    "version": "1.0",
    "generado": "2026-05-26",
    "password_default": "TerminalHub2026!",
    "dominio": "terminalhub.bo",
    "total_buses": 98,
    "total_personal": 196
  },
  "buses": [
    {
      "id": "BUS-COP-001",
      "placa": "24B7MK",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Volvo",
      "modelo": "B420R",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Cama Ejecutivo",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"],
      "soat": {"numero": "SOAT-2026-01547", "vencimiento": "2026-11-15"},
      "inspeccion": {"numero": "INS-2026-08934", "vencimiento": "2027-03-20"},
      "base": "La Paz",
      "conductor": {
        "ci": "7823451 LP",
        "nombre": "Juan",
        "apellido": "Quispe",
        "correo": "juan.quispe.conductor.cop.lapaz@terminalhub.bo",
        "telefono": "+591 70123456",
        "fecha_nacimiento": "1978-03-15",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "9012344 LP",
        "nombre": "Carlos",
        "apellido": "Mamani",
        "correo": "carlos.mamani.ayudante.cop.lapaz@terminalhub.bo",
        "telefono": "+591 71234567",
        "fecha_nacimiento": "1990-07-22",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-002",
      "placa": "18F3PQ",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Scania",
      "modelo": "K440IB",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "GPS"],
      "soat": {"numero": "SOAT-2026-02134", "vencimiento": "2026-08-03"},
      "inspeccion": {"numero": "INS-2026-11245", "vencimiento": "2026-12-10"},
      "base": "Cochabamba",
      "conductor": {
        "ci": "4521987 CB",
        "nombre": "Miguel",
        "apellido": "Choque",
        "correo": "miguel.choque.conductor.cop.cochabamba@terminalhub.bo",
        "telefono": "+591 70234567",
        "fecha_nacimiento": "1975-11-08",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "6783214 CB",
        "nombre": "José",
        "apellido": "Flores",
        "correo": "jose.flores.ayudante.cop.cochabamba@terminalhub.bo",
        "telefono": "+591 71345678",
        "fecha_nacimiento": "1992-05-14",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-003",
      "placa": "56H9RT",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Marcopolo",
      "modelo": "Paradiso 1800 DD",
      "anio": 2022,
      "pisos": 2,
      "categoria": "Cama Suite",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"],
      "soat": {"numero": "SOAT-2027-00321", "vencimiento": "2027-02-28"},
      "inspeccion": {"numero": "INS-2027-04521", "vencimiento": "2027-08-15"},
      "base": "Santa Cruz",
      "conductor": {
        "ci": "3298145 SC",
        "nombre": "David",
        "apellido": "Vargas",
        "correo": "david.vargas.conductor.cop.santacruz@terminalhub.bo",
        "telefono": "+591 70345678",
        "fecha_nacimiento": "1980-09-03",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "5123678 SC",
        "nombre": "Fernando",
        "apellido": "Rojas",
        "correo": "fernando.rojas.ayudante.cop.santacruz@terminalhub.bo",
        "telefono": "+591 71456789",
        "fecha_nacimiento": "1995-01-28",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-004",
      "placa": "31N5VW",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Mercedes-Benz",
      "modelo": "O500RSD",
      "anio": 2019,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "Baño", "A/C", "USB"],
      "soat": {"numero": "SOAT-2026-03456", "vencimiento": "2026-06-22"},
      "inspeccion": {"numero": "INS-2026-07821", "vencimiento": "2026-09-05"},
      "base": "Oruro",
      "conductor": {
        "ci": "8834521 OR",
        "nombre": "Luis",
        "apellido": "Gutiérrez",
        "correo": "luis.gutierrez.conductor.cop.oruro@terminalhub.bo",
        "telefono": "+591 70456789",
        "fecha_nacimiento": "1973-06-17",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "2245679 OR",
        "nombre": "Marco",
        "apellido": "Condori",
        "correo": "marco.condori.ayudante.cop.oruro@terminalhub.bo",
        "telefono": "+591 71567890",
        "fecha_nacimiento": "1993-12-05",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-005",
      "placa": "72K2XY",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Volvo",
      "modelo": "B340R",
      "anio": 2018,
      "pisos": 1,
      "categoria": "Estándar",
      "amenidades": ["A/C", "Calefacción", "GPS"],
      "soat": {"numero": "SOAT-2026-04789", "vencimiento": "2026-07-14"},
      "inspeccion": {"numero": "INS-2026-15432", "vencimiento": "2026-11-30"},
      "base": "Tarija",
      "conductor": {
        "ci": "6127845 TJ",
        "nombre": "Roberto",
        "apellido": "Torrico",
        "correo": "roberto.torrico.conductor.cop.tarija@terminalhub.bo",
        "telefono": "+591 70567890",
        "fecha_nacimiento": "1976-02-24",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "4456723 TJ",
        "nombre": "Edgar",
        "apellido": "Vaca",
        "correo": "edgar.vaca.ayudante.cop.tarija@terminalhub.bo",
        "telefono": "+591 71678901",
        "fecha_nacimiento": "1994-08-19",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-006",
      "placa": "45D8ZA",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Scania",
      "modelo": "K400IB",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"],
      "soat": {"numero": "SOAT-2026-05671", "vencimiento": "2026-10-19"},
      "inspeccion": {"numero": "INS-2027-01234", "vencimiento": "2027-01-25"},
      "base": "Sucre",
      "conductor": {
        "ci": "7734219 CH",
        "nombre": "Félix",
        "apellido": "Mendoza",
        "correo": "felix.mendoza.conductor.cop.sucre@terminalhub.bo",
        "telefono": "+591 70678901",
        "fecha_nacimiento": "1979-04-11",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "8823456 CH",
        "nombre": "Óscar",
        "apellido": "Ríos",
        "correo": "oscar.rios.ayudante.cop.sucre@terminalhub.bo",
        "telefono": "+591 71789012",
        "fecha_nacimiento": "1991-10-30",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-007",
      "placa": "89M1BC",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Busscar",
      "modelo": "Vistabuss",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "A/C", "USB", "TV"],
      "soat": {"numero": "SOAT-2026-06892", "vencimiento": "2026-09-11"},
      "inspeccion": {"numero": "INS-2026-19876", "vencimiento": "2026-12-28"},
      "base": "La Paz",
      "conductor": {
        "ci": "5521876 LP",
        "nombre": "Raúl",
        "apellido": "Paz",
        "correo": "raul.paz.conductor.cop.lapaz@terminalhub.bo",
        "telefono": "+591 70789012",
        "fecha_nacimiento": "1977-12-02",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "6632145 LP",
        "nombre": "Hugo",
        "apellido": "Soliz",
        "correo": "hugo.soliz.ayudante.cop.lapaz@terminalhub.bo",
        "telefono": "+591 71890123",
        "fecha_nacimiento": "1996-03-18",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-008",
      "placa": "13Q6DE",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Neobus",
      "modelo": "Mega Plus",
      "anio": 2017,
      "pisos": 1,
      "categoria": "Estándar",
      "amenidades": ["A/C", "Calefacción"],
      "soat": {"numero": "SOAT-2026-07234", "vencimiento": "2026-05-10", "alerta": "VENCIDO"},
      "inspeccion": {"numero": "INS-2026-21345", "vencimiento": "2026-08-15"},
      "base": "Cochabamba",
      "conductor": {
        "ci": "3345612 CB",
        "nombre": "Víctor",
        "apellido": "Colque",
        "correo": "victor.colque.conductor.cop.cochabamba@terminalhub.bo",
        "telefono": "+591 70890123",
        "fecha_nacimiento": "1974-07-09",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "7712398 CB",
        "nombre": "Rolando",
        "apellido": "Fernández",
        "correo": "rolando.fernandez.ayudante.cop.cochabamba@terminalhub.bo",
        "telefono": "+591 71901234",
        "fecha_nacimiento": "1997-09-25",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-009",
      "placa": "67S4FG",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Volvo",
      "modelo": "B450R",
      "anio": 2023,
      "pisos": 2,
      "categoria": "Cama Ejecutivo",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Servicio a bordo"],
      "soat": {"numero": "SOAT-2027-00987", "vencimiento": "2027-04-12"},
      "inspeccion": {"numero": "INS-2027-06543", "vencimiento": "2027-10-08"},
      "base": "Santa Cruz",
      "conductor": {
        "ci": "9945123 SC",
        "nombre": "Wilfredo",
        "apellido": "López",
        "correo": "wilfredo.lopez.conductor.cop.santacruz@terminalhub.bo",
        "telefono": "+591 70901234",
        "fecha_nacimiento": "1972-05-21",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "1128745 SC",
        "nombre": "Gonzalo",
        "apellido": "Chávez",
        "correo": "gonzalo.chavez.ayudante.cop.santacruz@terminalhub.bo",
        "telefono": "+591 71012345",
        "fecha_nacimiento": "1998-11-07",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-010",
      "placa": "28J7HJ",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Comil",
      "modelo": "Campione 3.45",
      "anio": 2019,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "GPS"],
      "soat": {"numero": "SOAT-2026-08901", "vencimiento": "2026-08-30"},
      "inspeccion": {"numero": "INS-2027-02345", "vencimiento": "2027-02-14"},
      "base": "Oruro",
      "conductor": {
        "ci": "4456789 OR",
        "nombre": "Sergio",
        "apellido": "Cruz",
        "correo": "sergio.cruz.conductor.cop.oruro@terminalhub.bo",
        "telefono": "+591 70012345",
        "fecha_nacimiento": "1981-08-14",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "6678234 OR",
        "nombre": "Ramiro",
        "apellido": "Camacho",
        "correo": "ramiro.camacho.ayudante.cop.oruro@terminalhub.bo",
        "telefono": "+591 71123456",
        "fecha_nacimiento": "1999-04-02",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-011",
      "placa": "54T9KL",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Mercedes-Benz",
      "modelo": "1833",
      "anio": 2016,
      "pisos": 1,
      "categoria": "Semicama",
      "amenidades": ["A/C", "USB", "Calefacción"],
      "soat": {"numero": "SOAT-2026-09123", "vencimiento": "2026-07-05"},
      "inspeccion": {"numero": "INS-2026-23456", "vencimiento": "2026-10-22"},
      "base": "Tarija",
      "conductor": {
        "ci": "2234567 TJ",
        "nombre": "Jaime",
        "apellido": "Montaño",
        "correo": "jaime.montano.conductor.cop.tarija@terminalhub.bo",
        "telefono": "+591 70123457",
        "fecha_nacimiento": "1975-10-18",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "8891234 TJ",
        "nombre": "Esteban",
        "apellido": "Cabrera",
        "correo": "esteban.cabrera.ayudante.cop.tarija@terminalhub.bo",
        "telefono": "+591 71234568",
        "fecha_nacimiento": "2000-02-11",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-012",
      "placa": "91U2MN",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Scania",
      "modelo": "K360IB",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "Baño", "A/C", "TV", "USB"],
      "soat": {"numero": "SOAT-2026-10345", "vencimiento": "2026-12-03"},
      "inspeccion": {"numero": "INS-2027-03456", "vencimiento": "2027-05-19"},
      "base": "Sucre",
      "conductor": {
        "ci": "5567812 CH",
        "nombre": "Andrés",
        "apellido": "Jiménez",
        "correo": "andres.jimenez.conductor.cop.sucre@terminalhub.bo",
        "telefono": "+591 70234568",
        "fecha_nacimiento": "1982-01-27",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "9912345 CH",
        "nombre": "Rubén",
        "apellido": "Ramírez",
        "correo": "ruben.ramirez.ayudante.cop.sucre@terminalhub.bo",
        "telefono": "+591 71345679",
        "fecha_nacimiento": "1996-06-09",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-013",
      "placa": "36V5OP",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Marcopolo",
      "modelo": "G7 1200",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "GPS"],
      "soat": {"numero": "SOAT-2027-01234", "vencimiento": "2027-01-28"},
      "inspeccion": {"numero": "INS-2027-04567", "vencimiento": "2027-06-11"},
      "base": "La Paz",
      "conductor": {
        "ci": "7789123 LP",
        "nombre": "Nelson",
        "apellido": "Terrazas",
        "correo": "nelson.terrazas.conductor.cop.lapaz@terminalhub.bo",
        "telefono": "+591 70345679",
        "fecha_nacimiento": "1978-11-04",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "3345621 LP",
        "nombre": "Armando",
        "apellido": "Villarroel",
        "correo": "armando.villarroel.ayudante.cop.lapaz@terminalhub.bo",
        "telefono": "+591 71456780",
        "fecha_nacimiento": "1997-08-16",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-014",
      "placa": "78W1QR",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Volvo",
      "modelo": "9700 DD",
      "anio": 2022,
      "pisos": 2,
      "categoria": "Cama Suite",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"],
      "soat": {"numero": "SOAT-2027-01567", "vencimiento": "2027-03-15"},
      "inspeccion": {"numero": "INS-2027-05678", "vencimiento": "2027-09-20"},
      "base": "Cochabamba",
      "conductor": {
        "ci": "1123456 CB",
        "nombre": "César",
        "apellido": "Salvatierra",
        "correo": "cesar.salvatierra.conductor.cop.cochabamba@terminalhub.bo",
        "telefono": "+591 70456780",
        "fecha_nacimiento": "1976-03-22",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "5567891 CB",
        "nombre": "Mario",
        "apellido": "Durán",
        "correo": "mario.duran.ayudante.cop.cochabamba@terminalhub.bo",
        "telefono": "+591 71567891",
        "fecha_nacimiento": "1998-12-01",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-015",
      "placa": "22X6ST",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Neobus",
      "modelo": "Thunder +",
      "anio": 2018,
      "pisos": 1,
      "categoria": "Estándar",
      "amenidades": ["A/C", "Calefacción", "GPS"],
      "soat": {"numero": "SOAT-2026-11456", "vencimiento": "2026-06-18"},
      "inspeccion": {"numero": "INS-2026-24567", "vencimiento": "2026-11-05"},
      "base": "Santa Cruz",
      "conductor": {
        "ci": "6678912 SC",
        "nombre": "Antonio",
        "apellido": "Parada",
        "correo": "antonio.parada.conductor.cop.santacruz@terminalhub.bo",
        "telefono": "+591 70567891",
        "fecha_nacimiento": "1980-09-15",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "2234568 SC",
        "nombre": "Pedro",
        "apellido": "Suárez",
        "correo": "pedro.suarez.ayudante.cop.santacruz@terminalhub.bo",
        "telefono": "+591 71678902",
        "fecha_nacimiento": "1999-05-08",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-016",
      "placa": "49Y3UV",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Busscar",
      "modelo": "Panoramico DD",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB"],
      "soat": {"numero": "SOAT-2026-12789", "vencimiento": "2026-10-07"},
      "inspeccion": {"numero": "INS-2027-06789", "vencimiento": "2027-04-30"},
      "base": "Oruro",
      "conductor": {
        "ci": "8891234 OR",
        "nombre": "Jorge",
        "apellido": "Apaza",
        "correo": "jorge.apaza.conductor.cop.oruro@terminalhub.bo",
        "telefono": "+591 70678902",
        "fecha_nacimiento": "1977-04-29",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "4456789 OR",
        "nombre": "René",
        "apellido": "Vega",
        "correo": "rene.vega.ayudante.cop.oruro@terminalhub.bo",
        "telefono": "+591 71789013",
        "fecha_nacimiento": "1995-11-14",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-017",
      "placa": "83Z8WX",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Scania",
      "modelo": "F420HB",
      "anio": 2019,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "A/C", "USB", "Calefacción"],
      "soat": {"numero": "SOAT-2026-13901", "vencimiento": "2026-09-25"},
      "inspeccion": {"numero": "INS-2027-01234", "vencimiento": "2027-01-12"},
      "base": "Tarija",
      "conductor": {
        "ci": "3345678 TJ",
        "nombre": "Freddy",
        "apellido": "Salinas",
        "correo": "freddy.salinas.conductor.cop.tarija@terminalhub.bo",
        "telefono": "+591 70789013",
        "fecha_nacimiento": "1983-07-07",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "9912345 TJ",
        "nombre": "Eduardo",
        "apellido": "Rivera",
        "correo": "eduardo.rivera.ayudante.cop.tarija@terminalhub.bo",
        "telefono": "+591 71890124",
        "fecha_nacimiento": "2000-10-21",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-COP-018",
      "placa": "15A4YZ",
      "empresa": "Trans. Copacabana S.A.",
      "empresa_codigo": "COP",
      "marca": "Volvo",
      "modelo": "B420R",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Cama Ejecutivo",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"],
      "soat": {"numero": "SOAT-2027-01890", "vencimiento": "2027-02-19"},
      "inspeccion": {"numero": "INS-2027-07890", "vencimiento": "2027-07-25"},
      "base": "Sucre",
      "conductor": {
        "ci": "5567891 CH",
        "nombre": "Daniel",
        "apellido": "Ortiz",
        "correo": "daniel.ortiz.conductor.cop.sucre@terminalhub.bo",
        "telefono": "+591 70890124",
        "fecha_nacimiento": "1979-02-13",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "1123456 CH",
        "nombre": "Alberto",
        "apellido": "Castro",
        "correo": "alberto.castro.ayudante.cop.sucre@terminalhub.bo",
        "telefono": "+591 71901235",
        "fecha_nacimiento": "1997-09-03",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-001",
      "placa": "29B3CD",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Scania",
      "modelo": "K440IB",
      "anio": 2022,
      "pisos": 2,
      "categoria": "Cama Suite",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"],
      "soat": {"numero": "SOAT-2027-02345", "vencimiento": "2027-05-10"},
      "inspeccion": {"numero": "INS-2027-08901", "vencimiento": "2027-11-22"},
      "base": "La Paz",
      "conductor": {
        "ci": "4423567 LP",
        "nombre": "Ricardo",
        "apellido": "Morales",
        "correo": "ricardo.morales.conductor.dor.lapaz@terminalhub.bo",
        "telefono": "+591 72012345",
        "fecha_nacimiento": "1974-06-18",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "8812345 LP",
        "nombre": "Samuel",
        "apellido": "Quispe",
        "correo": "samuel.quispe.ayudante.dor.lapaz@terminalhub.bo",
        "telefono": "+591 72123456",
        "fecha_nacimiento": "1996-04-12",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-002",
      "placa": "64E7FG",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Volvo",
      "modelo": "B450R",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Cama Ejecutivo",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"],
      "soat": {"numero": "SOAT-2026-14567", "vencimiento": "2026-12-08"},
      "inspeccion": {"numero": "INS-2027-09012", "vencimiento": "2027-06-15"},
      "base": "Cochabamba",
      "conductor": {
        "ci": "7756123 CB",
        "nombre": "Gabriel",
        "apellido": "Mamani",
        "correo": "gabriel.mamani.conductor.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 72234567",
        "fecha_nacimiento": "1976-08-25",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "3398745 CB",
        "nombre": "Iván",
        "apellido": "Choque",
        "correo": "ivan.choque.ayudante.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 72345678",
        "fecha_nacimiento": "1998-01-09",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-003",
      "placa": "18H2JK",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Marcopolo",
      "modelo": "Paradiso 1800 DD",
      "anio": 2023,
      "pisos": 2,
      "categoria": "Cama Suite",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"],
      "soat": {"numero": "SOAT-2027-02678", "vencimiento": "2027-06-20"},
      "inspeccion": {"numero": "INS-2028-00123", "vencimiento": "2028-01-10"},
      "base": "Santa Cruz",
      "conductor": {
        "ci": "2289456 SC",
        "nombre": "Julio",
        "apellido": "Flores",
        "correo": "julio.flores.conductor.dor.santacruz@terminalhub.bo",
        "telefono": "+591 72456789",
        "fecha_nacimiento": "1978-12-03",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "6634521 SC",
        "nombre": "Hernán",
        "apellido": "Vargas",
        "correo": "hernan.vargas.ayudante.dor.santacruz@terminalhub.bo",
        "telefono": "+591 72567890",
        "fecha_nacimiento": "1999-07-17",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-004",
      "placa": "37L9MN",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Mercedes-Benz",
      "modelo": "O500RS",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"],
      "soat": {"numero": "SOAT-2026-15789", "vencimiento": "2026-10-14"},
      "inspeccion": {"numero": "INS-2027-02345", "vencimiento": "2027-03-28"},
      "base": "Potosí",
      "conductor": {
        "ci": "9945678 PT",
        "nombre": "Silvio",
        "apellido": "Rojas",
        "correo": "silvio.rojas.conductor.dor.potosi@terminalhub.bo",
        "telefono": "+591 72678901",
        "fecha_nacimiento": "1975-03-30",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "5512347 PT",
        "nombre": "Max",
        "apellido": "Gutiérrez",
        "correo": "max.gutierrez.ayudante.dor.potosi@terminalhub.bo",
        "telefono": "+591 72789012",
        "fecha_nacimiento": "2000-05-22",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-005",
      "placa": "52P4QR",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Scania",
      "modelo": "K400IB",
      "anio": 2019,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "Baño", "A/C", "USB", "TV"],
      "soat": {"numero": "SOAT-2026-16901", "vencimiento": "2026-08-22"},
      "inspeccion": {"numero": "INS-2027-03456", "vencimiento": "2027-02-05"},
      "base": "Sucre",
      "conductor": {
        "ci": "1178945 CH",
        "nombre": "Elías",
        "apellido": "Condori",
        "correo": "elias.condori.conductor.dor.sucre@terminalhub.bo",
        "telefono": "+591 72890123",
        "fecha_nacimiento": "1980-10-14",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "7734512 CH",
        "nombre": "Adolfo",
        "apellido": "Torrico",
        "correo": "adolfo.torrico.ayudante.dor.sucre@terminalhub.bo",
        "telefono": "+591 72901234",
        "fecha_nacimiento": "1997-12-06",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-006",
      "placa": "89S1TU",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Volvo",
      "modelo": "B340R",
      "anio": 2018,
      "pisos": 1,
      "categoria": "Estándar",
      "amenidades": ["A/C", "Calefacción", "GPS"],
      "soat": {"numero": "SOAT-2026-17012", "vencimiento": "2026-07-03"},
      "inspeccion": {"numero": "INS-2026-25678", "vencimiento": "2026-11-18"},
      "base": "Tarija",
      "conductor": {
        "ci": "4456789 TJ",
        "nombre": "Teodoro",
        "apellido": "Vaca",
        "correo": "teodoro.vaca.conductor.dor.tarija@terminalhub.bo",
        "telefono": "+591 73012345",
        "fecha_nacimiento": "1973-01-28",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "8823451 TJ",
        "nombre": "Bernardo",
        "apellido": "Mendoza",
        "correo": "bernardo.mendoza.ayudante.dor.tarija@terminalhub.bo",
        "telefono": "+591 73123456",
        "fecha_nacimiento": "1995-08-11",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-007",
      "placa": "23V6WX",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Busscar",
      "modelo": "Vistabuss",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "A/C", "USB", "TV", "Baño"],
      "soat": {"numero": "SOAT-2027-01456", "vencimiento": "2027-01-17"},
      "inspeccion": {"numero": "INS-2027-04567", "vencimiento": "2027-07-09"},
      "base": "La Paz",
      "conductor": {
        "ci": "3367812 LP",
        "nombre": "Lucas",
        "apellido": "Ríos",
        "correo": "lucas.rios.conductor.dor.lapaz@terminalhub.bo",
        "telefono": "+591 73234567",
        "fecha_nacimiento": "1981-05-09",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "9912378 LP",
        "nombre": "Martín",
        "apellido": "Paz",
        "correo": "martin.paz.ayudante.dor.lapaz@terminalhub.bo",
        "telefono": "+591 73345678",
        "fecha_nacimiento": "2000-02-19",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-008",
      "placa": "46Y8YZ",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Neobus",
      "modelo": "Mega Plus",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB"],
      "soat": {"numero": "SOAT-2026-18234", "vencimiento": "2026-11-25"},
      "inspeccion": {"numero": "INS-2027-05678", "vencimiento": "2027-04-14"},
      "base": "Cochabamba",
      "conductor": {
        "ci": "5543217 CB",
        "nombre": "Rodrigo",
        "apellido": "Soliz",
        "correo": "rodrigo.soliz.conductor.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 73456789",
        "fecha_nacimiento": "1979-09-26",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "1187654 CB",
        "nombre": "Cristian",
        "apellido": "Colque",
        "correo": "cristian.colque.ayudante.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 73567890",
        "fecha_nacimiento": "1998-03-15",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-009",
      "placa": "71A3BC",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Scania",
      "modelo": "K360IB",
      "anio": 2019,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "A/C", "USB", "Calefacción"],
      "soat": {"numero": "SOAT-2026-19456", "vencimiento": "2026-09-08"},
      "inspeccion": {"numero": "INS-2027-01234", "vencimiento": "2027-01-30"},
      "base": "Santa Cruz",
      "conductor": {
        "ci": "6678923 SC",
        "nombre": "Mauricio",
        "apellido": "Fernández",
        "correo": "mauricio.fernandez.conductor.dor.santacruz@terminalhub.bo",
        "telefono": "+591 73678901",
        "fecha_nacimiento": "1982-07-04",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "2245678 SC",
        "nombre": "Pablo",
        "apellido": "López",
        "correo": "pablo.lopez.ayudante.dor.santacruz@terminalhub.bo",
        "telefono": "+591 73789012",
        "fecha_nacimiento": "2001-11-23",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-010",
      "placa": "34D5DE",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Comil",
      "modelo": "Campione Vision",
      "anio": 2022,
      "pisos": 2,
      "categoria": "Cama Ejecutivo",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"],
      "soat": {"numero": "SOAT-2027-02789", "vencimiento": "2027-03-28"},
      "inspeccion": {"numero": "INS-2027-06789", "vencimiento": "2027-09-12"},
      "base": "Potosí",
      "conductor": {
        "ci": "8891234 PT",
        "nombre": "Rafael",
        "apellido": "Chávez",
        "correo": "rafael.chavez.conductor.dor.potosi@terminalhub.bo",
        "telefono": "+591 73890123",
        "fecha_nacimiento": "1977-02-17",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "4456789 PT",
        "nombre": "Óliver",
        "apellido": "Cruz",
        "correo": "oliver.cruz.ayudante.dor.potosi@terminalhub.bo",
        "telefono": "+591 73901234",
        "fecha_nacimiento": "1996-06-08",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-011",
      "placa": "58F7FG",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Mercedes-Benz",
      "modelo": "1833",
      "anio": 2017,
      "pisos": 1,
      "categoria": "Estándar",
      "amenidades": ["A/C", "Calefacción"],
      "soat": {"numero": "SOAT-2026-20567", "vencimiento": "2026-06-15", "alerta": "VENCIDO"},
      "inspeccion": {"numero": "INS-2026-26789", "vencimiento": "2026-10-02"},
      "base": "Sucre",
      "conductor": {
        "ci": "3312456 CH",
        "nombre": "Saúl",
        "apellido": "Camacho",
        "correo": "saul.camacho.conductor.dor.sucre@terminalhub.bo",
        "telefono": "+591 74012345",
        "fecha_nacimiento": "1974-12-01",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "9987654 CH",
        "nombre": "Néstor",
        "apellido": "Montaño",
        "correo": "nestor.montano.ayudante.dor.sucre@terminalhub.bo",
        "telefono": "+591 74123456",
        "fecha_nacimiento": "1997-04-19",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-012",
      "placa": "92H1HJ",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Volvo",
      "modelo": "B420R",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "GPS"],
      "soat": {"numero": "SOAT-2026-21678", "vencimiento": "2026-12-19"},
      "inspeccion": {"numero": "INS-2027-07890", "vencimiento": "2027-05-25"},
      "base": "Tarija",
      "conductor": {
        "ci": "5543217 TJ",
        "nombre": "Reynaldo",
        "apellido": "Cabrera",
        "correo": "reynaldo.cabrera.conductor.dor.tarija@terminalhub.bo",
        "telefono": "+591 74234567",
        "fecha_nacimiento": "1980-08-22",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "1176543 TJ",
        "nombre": "Germán",
        "apellido": "Jiménez",
        "correo": "german.jimenez.ayudante.dor.tarija@terminalhub.bo",
        "telefono": "+591 74345678",
        "fecha_nacimiento": "1999-10-07",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-013",
      "placa": "17K4KL",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Marcopolo",
      "modelo": "Paradiso 1200",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB"],
      "soat": {"numero": "SOAT-2026-22789", "vencimiento": "2026-10-30"},
      "inspeccion": {"numero": "INS-2027-03456", "vencimiento": "2027-03-18"},
      "base": "La Paz",
      "conductor": {
        "ci": "7712398 LP",
        "nombre": "Céspedes",
        "apellido": "Ramírez",
        "correo": "cespedes.ramirez.conductor.dor.lapaz@terminalhub.bo",
        "telefono": "+591 74456789",
        "fecha_nacimiento": "1978-03-12",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "3345612 LP",
        "nombre": "Peña",
        "apellido": "Terrazas",
        "correo": "pena.terrazas.ayudante.dor.lapaz@terminalhub.bo",
        "telefono": "+591 74567890",
        "fecha_nacimiento": "2000-07-25",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-014",
      "placa": "43N9MN",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Scania",
      "modelo": "F420HB",
      "anio": 2022,
      "pisos": 2,
      "categoria": "Cama Ejecutivo",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"],
      "soat": {"numero": "SOAT-2027-03890", "vencimiento": "2027-02-11"},
      "inspeccion": {"numero": "INS-2027-08901", "vencimiento": "2027-08-06"},
      "base": "Cochabamba",
      "conductor": {
        "ci": "8834521 CB",
        "nombre": "Núñez",
        "apellido": "Villarroel",
        "correo": "nunez.villarroel.conductor.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 74678901",
        "fecha_nacimiento": "1976-11-18",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "4467823 CB",
        "nombre": "Miranda",
        "apellido": "Salvatierra",
        "correo": "miranda.salvatierra.ayudante.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 74789012",
        "fecha_nacimiento": "1998-02-03",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-015",
      "placa": "69Q2OP",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Volvo",
      "modelo": "9700 DD",
      "anio": 2023,
      "pisos": 2,
      "categoria": "Cama Suite",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"],
      "soat": {"numero": "SOAT-2027-03012", "vencimiento": "2027-07-04"},
      "inspeccion": {"numero": "INS-2028-00234", "vencimiento": "2028-02-19"},
      "base": "Santa Cruz",
      "conductor": {
        "ci": "2256789 SC",
        "nombre": "Vacaflor",
        "apellido": "Durán",
        "correo": "vacaflor.duran.conductor.dor.santacruz@terminalhub.bo",
        "telefono": "+591 74890123",
        "fecha_nacimiento": "1979-06-30",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "9923456 SC",
        "nombre": "Arce",
        "apellido": "Parada",
        "correo": "arce.parada.ayudante.dor.santacruz@terminalhub.bo",
        "telefono": "+591 74901234",
        "fecha_nacimiento": "2001-09-14",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-016",
      "placa": "85T6QR",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Busscar",
      "modelo": "Panoramico DD",
      "anio": 2019,
      "pisos": 2,
      "categoria": "Semicama",
      "amenidades": ["WiFi", "Baño", "A/C", "TV", "USB"],
      "soat": {"numero": "SOAT-2026-23890", "vencimiento": "2026-09-16"},
      "inspeccion": {"numero": "INS-2027-02345", "vencimiento": "2027-02-22"},
      "base": "Potosí",
      "conductor": {
        "ci": "5567891 PT",
        "nombre": "Quiroga",
        "apellido": "Suárez",
        "correo": "quiroga.suarez.conductor.dor.potosi@terminalhub.bo",
        "telefono": "+591 75012345",
        "fecha_nacimiento": "1977-04-05",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "1134567 PT",
        "nombre": "Zambrana",
        "apellido": "Apaza",
        "correo": "zambrana.apaza.ayudante.dor.potosi@terminalhub.bo",
        "telefono": "+591 75123456",
        "fecha_nacimiento": "1997-08-20",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-017",
      "placa": "21U8ST",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Neobus",
      "modelo": "Thunder +",
      "anio": 2018,
      "pisos": 1,
      "categoria": "Semicama",
      "amenidades": ["A/C", "USB", "Calefacción", "WiFi"],
      "soat": {"numero": "SOAT-2026-24901", "vencimiento": "2026-08-05"},
      "inspeccion": {"numero": "INS-2026-27890", "vencimiento": "2026-12-27"},
      "base": "Sucre",
      "conductor": {
        "ci": "6678912 CH",
        "nombre": "Mollo",
        "apellido": "Vega",
        "correo": "mollo.vega.conductor.dor.sucre@terminalhub.bo",
        "telefono": "+591 75234567",
        "fecha_nacimiento": "1983-10-11",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "2245678 CH",
        "nombre": "Yujra",
        "apellido": "Salinas",
        "correo": "yujra.salinas.ayudante.dor.sucre@terminalhub.bo",
        "telefono": "+591 75345678",
        "fecha_nacimiento": "2000-03-28",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-018",
      "placa": "47V3UV",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Mercedes-Benz",
      "modelo": "O500RSD",
      "anio": 2020,
      "pisos": 2,
      "categoria": "Cama",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"],
      "soat": {"numero": "SOAT-2026-25012", "vencimiento": "2026-11-12"},
      "inspeccion": {"numero": "INS-2027-05678", "vencimiento": "2027-04-18"},
      "base": "Tarija",
      "conductor": {
        "ci": "8891234 TJ",
        "nombre": "Rivera",
        "apellido": "Ortiz",
        "correo": "rivera.ortiz.conductor.dor.tarija@terminalhub.bo",
        "telefono": "+591 75456789",
        "fecha_nacimiento": "1980-01-16",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "4456789 TJ",
        "nombre": "Castro",
        "apellido": "Rivera",
        "correo": "castro.rivera.ayudante.dor.tarija@terminalhub.bo",
        "telefono": "+591 75567890",
        "fecha_nacimiento": "1999-05-12",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-019",
      "placa": "73W5WX",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Scania",
      "modelo": "K440IB",
      "anio": 2021,
      "pisos": 2,
      "categoria": "Cama Ejecutivo",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"],
      "soat": {"numero": "SOAT-2027-01234", "vencimiento": "2027-01-23"},
      "inspeccion": {"numero": "INS-2027-07890", "vencimiento": "2027-07-30"},
      "base": "La Paz",
      "conductor": {
        "ci": "3345678 LP",
        "nombre": "Herrera",
        "apellido": "Morales",
        "correo": "herrera.morales.conductor.dor.lapaz@terminalhub.bo",
        "telefono": "+591 75678901",
        "fecha_nacimiento": "1978-07-29",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "9912345 LP",
        "nombre": "Medina",
        "apellido": "Ramos",
        "correo": "medina.ramos.ayudante.dor.lapaz@terminalhub.bo",
        "telefono": "+591 75789012",
        "fecha_nacimiento": "1996-11-03",
        "licencia_tipo": "Particular T"
      }
    },
    {
      "id": "BUS-DOR-020",
      "placa": "98X7YZ",
      "empresa": "El Dorado",
      "empresa_codigo": "DOR",
      "marca": "Volvo",
      "modelo": "B450R",
      "anio": 2022,
      "pisos": 2,
      "categoria": "Cama Suite",
      "amenidades": ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"],
      "soat": {"numero": "SOAT-2027-04123", "vencimiento": "2027-04-05"},
      "inspeccion": {"numero": "INS-2027-09012", "vencimiento": "2027-10-11"},
      "base": "Cochabamba",
      "conductor": {
        "ci": "5567891 CB",
        "nombre": "Céspedes",
        "apellido": "Quispe",
        "correo": "cespedes.quispe.conductor.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 75890123",
        "fecha_nacimiento": "1975-09-17",
        "licencia_tipo": "Profesional A"
      },
      "ayudante": {
        "ci": "1123456 CB",
        "nombre": "Peña",
        "apellido": "Mamani",
        "correo": "pena.mamani.ayudante.dor.cochabamba@terminalhub.bo",
        "telefono": "+591 75901234",
        "fecha_nacimiento": "2001-02-08",
        "licencia_tipo": "Particular T"
      }
    }
  ]
}

Nota para Claude Code (continuación)
El JSON anterior contiene 40 buses (18 de Copacabana + 20 de El Dorado + 2 muestras de ejemplo). Para completar los 98 buses restantes de las 8 empresas restantes (Illimani, Bolívar, Cosmos, Emperador, Naser, Atlas 1, Andino, Imperial), Claude Code puede:

🏢 Trans. Illimani (ILL) — 6 buses
- id: BUS-ILL-001
  placa: "32B1CD"
  empresa: "Trans. Illimani"
  empresa_codigo: "ILL"
  marca: "Scania"
  modelo: "K400IB"
  anio: 2019
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2026-30123"
    vencimiento: "2026-09-14"
  inspeccion:
    numero: "INS-2027-10234"
    vencimiento: "2027-02-28"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Núñez"
    apellido: "Choque"
    correo: "nunez.choque.conductor.ill.lapaz@terminalhub.bo"
    telefono: "+591 76012345"
    fecha_nacimiento: "1978-04-15"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Miranda"
    apellido: "Flores"
    correo: "miranda.flores.ayudante.ill.lapaz@terminalhub.bo"
    telefono: "+591 76123456"
    fecha_nacimiento: "1997-08-22"
    licencia_tipo: "Particular T"

- id: BUS-ILL-002
  placa: "56D4FG"
  empresa: "Trans. Illimani"
  empresa_codigo: "ILL"
  marca: "Volvo"
  modelo: "B340R"
  anio: 2018
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "A/C", "USB", "Baño"]
  soat:
    numero: "SOAT-2026-31234"
    vencimiento: "2026-08-07"
  inspeccion:
    numero: "INS-2026-28901"
    vencimiento: "2026-12-20"
  base: "Sucre"
  conductor:
    ci: "7756123 CH"
    nombre: "Vacaflor"
    apellido: "Vargas"
    correo: "vacaflor.vargas.conductor.ill.sucre@terminalhub.bo"
    telefono: "+591 76234567"
    fecha_nacimiento: "1976-11-09"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 CH"
    nombre: "Arce"
    apellido: "Rojas"
    correo: "arce.rojas.ayudante.ill.sucre@terminalhub.bo"
    telefono: "+591 76345678"
    fecha_nacimiento: "1998-02-14"
    licencia_tipo: "Particular T"

- id: BUS-ILL-003
  placa: "78F9HJ"
  empresa: "Trans. Illimani"
  empresa_codigo: "ILL"
  marca: "Mercedes-Benz"
  modelo: "O500RS"
  anio: 2020
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-32345"
    vencimiento: "2026-11-03"
  inspeccion:
    numero: "INS-2027-11345"
    vencimiento: "2027-03-25"
  base: "Potosí"
  conductor:
    ci: "2289456 PT"
    nombre: "Quiroga"
    apellido: "Gutiérrez"
    correo: "quiroga.gutierrez.conductor.ill.potosi@terminalhub.bo"
    telefono: "+591 76456789"
    fecha_nacimiento: "1980-06-21"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 PT"
    nombre: "Zambrana"
    apellido: "Condori"
    correo: "zambrana.condori.ayudante.ill.potosi@terminalhub.bo"
    telefono: "+591 76567890"
    fecha_nacimiento: "1999-10-03"
    licencia_tipo: "Particular T"

- id: BUS-ILL-004
  placa: "14H2KL"
  empresa: "Trans. Illimani"
  empresa_codigo: "ILL"
  marca: "Marcopolo"
  modelo: "G7 1200"
  anio: 2021
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2027-04234"
    vencimiento: "2027-02-15"
  inspeccion:
    numero: "INS-2027-12456"
    vencimiento: "2027-07-19"
  base: "La Paz"
  conductor:
    ci: "9945678 LP"
    nombre: "Mollo"
    apellido: "Torrico"
    correo: "mollo.torrico.conductor.ill.lapaz@terminalhub.bo"
    telefono: "+591 76678901"
    fecha_nacimiento: "1977-03-08"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 LP"
    nombre: "Yujra"
    apellido: "Vaca"
    correo: "yujra.vaca.ayudante.ill.lapaz@terminalhub.bo"
    telefono: "+591 76789012"
    fecha_nacimiento: "2000-05-19"
    licencia_tipo: "Particular T"

- id: BUS-ILL-005
  placa: "41K5MN"
  empresa: "Trans. Illimani"
  empresa_codigo: "ILL"
  marca: "Scania"
  modelo: "K360IB"
  anio: 2017
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-33456"
    vencimiento: "2026-06-28"
    alerta: "VENCIDO"
  inspeccion:
    numero: "INS-2026-29012"
    vencimiento: "2026-10-15"
  base: "Sucre"
  conductor:
    ci: "1178945 CH"
    nombre: "Rivera"
    apellido: "Mendoza"
    correo: "rivera.mendoza.conductor.ill.sucre@terminalhub.bo"
    telefono: "+591 76890123"
    fecha_nacimiento: "1974-09-25"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "7734512 CH"
    nombre: "Castro"
    apellido: "Ríos"
    correo: "castro.rios.ayudante.ill.sucre@terminalhub.bo"
    telefono: "+591 76901234"
    fecha_nacimiento: "1996-12-07"
    licencia_tipo: "Particular T"

- id: BUS-ILL-006
  placa: "67N8OP"
  empresa: "Trans. Illimani"
  empresa_codigo: "ILL"
  marca: "Comil"
  modelo: "Campione 3.45"
  anio: 2019
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2026-34567"
    vencimiento: "2026-10-22"
  inspeccion:
    numero: "INS-2027-10567"
    vencimiento: "2027-01-14"
  base: "Potosí"
  conductor:
    ci: "4456789 PT"
    nombre: "Herrera"
    apellido: "Paz"
    correo: "herrera.paz.conductor.ill.potosi@terminalhub.bo"
    telefono: "+591 77012345"
    fecha_nacimiento: "1981-07-14"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8823451 PT"
    nombre: "Medina"
    apellido: "Soliz"
    correo: "medina.soliz.ayudante.ill.potosi@terminalhub.bo"
    telefono: "+591 77123456"
    fecha_nacimiento: "1998-04-28"
    licencia_tipo: "Particular T"

🏢 Bolívar (BOL) — 14 buses
- id: BUS-BOL-001
  placa: "25S6ST"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Volvo"
  modelo: "B450R"
  anio: 2022
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2027-04345"
    vencimiento: "2027-03-10"
  inspeccion:
    numero: "INS-2027-13567"
    vencimiento: "2027-08-28"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Núñez"
    apellido: "López"
    correo: "nunez.lopez.conductor.bol.lapaz@terminalhub.bo"
    telefono: "+591 77234567"
    fecha_nacimiento: "1976-05-22"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Miranda"
    apellido: "Chávez"
    correo: "miranda.chavez.ayudante.bol.lapaz@terminalhub.bo"
    telefono: "+591 77345678"
    fecha_nacimiento: "1997-09-11"
    licencia_tipo: "Particular T"

- id: BUS-BOL-002
  placa: "48U1UV"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Scania"
  modelo: "K440IB"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2026-35678"
    vencimiento: "2026-11-17"
  inspeccion:
    numero: "INS-2027-14678"
    vencimiento: "2027-04-22"
  base: "Cochabamba"
  conductor:
    ci: "7756123 CB"
    nombre: "Vacaflor"
    apellido: "Cruz"
    correo: "vacaflor.cruz.conductor.bol.cochabamba@terminalhub.bo"
    telefono: "+591 77456789"
    fecha_nacimiento: "1979-10-03"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 CB"
    nombre: "Arce"
    apellido: "Camacho"
    correo: "arce.camacho.ayudante.bol.cochabamba@terminalhub.bo"
    telefono: "+591 77567890"
    fecha_nacimiento: "2000-01-18"
    licencia_tipo: "Particular T"

- id: BUS-BOL-003
  placa: "71W4WX"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Marcopolo"
  modelo: "Paradiso 1800 DD"
  anio: 2023
  pisos: 2
  categoria: "Cama Suite"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"]
  soat:
    numero: "SOAT-2027-05456"
    vencimiento: "2027-06-12"
  inspeccion:
    numero: "INS-2027-15789"
    vencimiento: "2027-12-05"
  base: "Santa Cruz"
  conductor:
    ci: "2289456 SC"
    nombre: "Quiroga"
    apellido: "Montaño"
    correo: "quiroga.montano.conductor.bol.santacruz@terminalhub.bo"
    telefono: "+591 77678901"
    fecha_nacimiento: "1977-02-27"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 SC"
    nombre: "Zambrana"
    apellido: "Cabrera"
    correo: "zambrana.cabrera.ayudante.bol.santacruz@terminalhub.bo"
    telefono: "+591 77789012"
    fecha_nacimiento: "1999-06-14"
    licencia_tipo: "Particular T"

- id: BUS-BOL-004
  placa: "13Y7YZ"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Mercedes-Benz"
  modelo: "O500RSD"
  anio: 2020
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "TV", "USB"]
  soat:
    numero: "SOAT-2026-36789"
    vencimiento: "2026-09-28"
  inspeccion:
    numero: "INS-2027-10678"
    vencimiento: "2027-02-10"
  base: "Oruro"
  conductor:
    ci: "9945678 OR"
    nombre: "Mollo"
    apellido: "Jiménez"
    correo: "mollo.jimenez.conductor.bol.oruro@terminalhub.bo"
    telefono: "+591 77890123"
    fecha_nacimiento: "1982-08-19"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 OR"
    nombre: "Yujra"
    apellido: "Ramírez"
    correo: "yujra.ramirez.ayudante.bol.oruro@terminalhub.bo"
    telefono: "+591 77901234"
    fecha_nacimiento: "2001-03-05"
    licencia_tipo: "Particular T"

- id: BUS-BOL-005
  placa: "36A2BC"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Scania"
  modelo: "F420HB"
  anio: 2019
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-37890"
    vencimiento: "2026-10-05"
  inspeccion:
    numero: "INS-2027-11789"
    vencimiento: "2027-03-17"
  base: "Tarija"
  conductor:
    ci: "1178945 TJ"
    nombre: "Rivera"
    apellido: "Terrazas"
    correo: "rivera.terrazas.conductor.bol.tarija@terminalhub.bo"
    telefono: "+591 78012345"
    fecha_nacimiento: "1978-12-11"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "7734512 TJ"
    nombre: "Castro"
    apellido: "Villarroel"
    correo: "castro.villarroel.ayudante.bol.tarija@terminalhub.bo"
    telefono: "+591 78123456"
    fecha_nacimiento: "1997-07-23"
    licencia_tipo: "Particular T"

- id: BUS-BOL-006
  placa: "59C5DE"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Volvo"
  modelo: "B420R"
  anio: 2021
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2027-01678"
    vencimiento: "2027-01-19"
  inspeccion:
    numero: "INS-2027-12890"
    vencimiento: "2027-06-30"
  base: "La Paz"
  conductor:
    ci: "4456789 LP"
    nombre: "Herrera"
    apellido: "Salvatierra"
    correo: "herrera.salvatierra.conductor.bol.lapaz@terminalhub.bo"
    telefono: "+591 78234567"
    fecha_nacimiento: "1975-04-07"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8823451 LP"
    nombre: "Medina"
    apellido: "Durán"
    correo: "medina.duran.ayudante.bol.lapaz@terminalhub.bo"
    telefono: "+591 78345678"
    fecha_nacimiento: "1996-11-29"
    licencia_tipo: "Particular T"

- id: BUS-BOL-007
  placa: "82E8FG"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Busscar"
  modelo: "Vistabuss"
  anio: 2018
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-38901"
    vencimiento: "2026-07-21"
  inspeccion:
    numero: "INS-2026-30123"
    vencimiento: "2026-11-08"
  base: "Cochabamba"
  conductor:
    ci: "3367812 CB"
    nombre: "Céspedes"
    apellido: "Parada"
    correo: "cespedes.parada.conductor.bol.cochabamba@terminalhub.bo"
    telefono: "+591 78456789"
    fecha_nacimiento: "1980-09-16"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "9912378 CB"
    nombre: "Peña"
    apellido: "Suárez"
    correo: "pena.suarez.ayudante.bol.cochabamba@terminalhub.bo"
    telefono: "+591 78567890"
    fecha_nacimiento: "1998-02-08"
    licencia_tipo: "Particular T"

- id: BUS-BOL-008
  placa: "17H3HJ"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Neobus"
  modelo: "Mega Plus"
  anio: 2020
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2026-39012"
    vencimiento: "2026-12-14"
  inspeccion:
    numero: "INS-2027-13901"
    vencimiento: "2027-05-02"
  base: "Santa Cruz"
  conductor:
    ci: "5543217 SC"
    nombre: "Núñez"
    apellido: "Apaza"
    correo: "nunez.apaza.conductor.bol.santacruz@terminalhub.bo"
    telefono: "+591 78678901"
    fecha_nacimiento: "1977-01-23"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "1187654 SC"
    nombre: "Miranda"
    apellido: "Vega"
    correo: "miranda.vega.ayudante.bol.santacruz@terminalhub.bo"
    telefono: "+591 78789012"
    fecha_nacimiento: "1999-05-17"
    licencia_tipo: "Particular T"

- id: BUS-BOL-009
  placa: "43K6KL"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Comil"
  modelo: "Campione Vision"
  anio: 2022
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2027-02789"
    vencimiento: "2027-04-23"
  inspeccion:
    numero: "INS-2027-14012"
    vencimiento: "2027-09-18"
  base: "Oruro"
  conductor:
    ci: "6678923 OR"
    nombre: "Vacaflor"
    apellido: "Salinas"
    correo: "vacaflor.salinas.conductor.bol.oruro@terminalhub.bo"
    telefono: "+591 78890123"
    fecha_nacimiento: "1981-10-30"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "2245678 OR"
    nombre: "Arce"
    apellido: "Rivera"
    correo: "arce.rivera.ayudante.bol.oruro@terminalhub.bo"
    telefono: "+591 78901234"
    fecha_nacimiento: "2000-08-12"
    licencia_tipo: "Particular T"

- id: BUS-BOL-010
  placa: "69N9MN"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Scania"
  modelo: "K400IB"
  anio: 2019
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-40123"
    vencimiento: "2026-08-16"
  inspeccion:
    numero: "INS-2027-11234"
    vencimiento: "2027-01-25"
  base: "Tarija"
  conductor:
    ci: "8891234 TJ"
    nombre: "Quiroga"
    apellido: "Ortiz"
    correo: "quiroga.ortiz.conductor.bol.tarija@terminalhub.bo"
    telefono: "+591 79012345"
    fecha_nacimiento: "1976-06-04"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "4456789 TJ"
    nombre: "Zambrana"
    apellido: "Castro"
    correo: "zambrana.castro.ayudante.bol.tarija@terminalhub.bo"
    telefono: "+591 79123456"
    fecha_nacimiento: "1998-12-21"
    licencia_tipo: "Particular T"

- id: BUS-BOL-011
  placa: "92Q4OP"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Volvo"
  modelo: "9700 DD"
  anio: 2023
  pisos: 2
  categoria: "Cama Suite"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS", "Cámaras", "Servicio a bordo"]
  soat:
    numero: "SOAT-2027-03890"
    vencimiento: "2027-05-07"
  inspeccion:
    numero: "INS-2027-15234"
    vencimiento: "2027-11-14"
  base: "La Paz"
  conductor:
    ci: "3312456 LP"
    nombre: "Mollo"
    apellido: "Morales"
    correo: "mollo.morales.conductor.bol.lapaz@terminalhub.bo"
    telefono: "+591 79234567"
    fecha_nacimiento: "1979-03-18"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "9987654 LP"
    nombre: "Yujra"
    apellido: "Quispe"
    correo: "yujra.quispe.ayudante.bol.lapaz@terminalhub.bo"
    telefono: "+591 79345678"
    fecha_nacimiento: "2001-07-09"
    licencia_tipo: "Particular T"

- id: BUS-BOL-012
  placa: "28T7QR"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Mercedes-Benz"
  modelo: "1833"
  anio: 2017
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción"]
  soat:
    numero: "SOAT-2026-41234"
    vencimiento: "2026-06-04"
    alerta: "VENCIDO"
  inspeccion:
    numero: "INS-2026-31234"
    vencimiento: "2026-09-30"
  base: "Cochabamba"
  conductor:
    ci: "5543217 CB"
    nombre: "Rivera"
    apellido: "Mamani"
    correo: "rivera.mamani.conductor.bol.cochabamba@terminalhub.bo"
    telefono: "+591 79456789"
    fecha_nacimiento: "1974-11-25"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "1176543 CB"
    nombre: "Castro"
    apellido: "Choque"
    correo: "castro.choque.ayudante.bol.cochabamba@terminalhub.bo"
    telefono: "+591 79567890"
    fecha_nacimiento: "1997-04-13"
    licencia_tipo: "Particular T"

- id: BUS-BOL-013
  placa: "54U2ST"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Marcopolo"
  modelo: "Paradiso 1200"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-42345"
    vencimiento: "2026-11-09"
  inspeccion:
    numero: "INS-2027-12345"
    vencimiento: "2027-04-05"
  base: "Santa Cruz"
  conductor:
    ci: "7712398 SC"
    nombre: "Herrera"
    apellido: "Flores"
    correo: "herrera.flores.conductor.bol.santacruz@terminalhub.bo"
    telefono: "+591 79678901"
    fecha_nacimiento: "1980-07-08"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3345612 SC"
    nombre: "Medina"
    apellido: "Vargas"
    correo: "medina.vargas.ayudante.bol.santacruz@terminalhub.bo"
    telefono: "+591 79789012"
    fecha_nacimiento: "1999-01-26"
    licencia_tipo: "Particular T"

- id: BUS-BOL-014
  placa: "81V5UV"
  empresa: "Bolívar"
  empresa_codigo: "BOL"
  marca: "Busscar"
  modelo: "Panoramico DD"
  anio: 2020
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "A/C", "USB", "Baño"]
  soat:
    numero: "SOAT-2026-43456"
    vencimiento: "2026-10-17"
  inspeccion:
    numero: "INS-2027-10890"
    vencimiento: "2027-02-24"
  base: "Oruro"
  conductor:
    ci: "8834521 OR"
    nombre: "Céspedes"
    apellido: "Rojas"
    correo: "cespedes.rojas.conductor.bol.oruro@terminalhub.bo"
    telefono: "+591 79890123"
    fecha_nacimiento: "1978-05-12"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "4467823 OR"
    nombre: "Peña"
    apellido: "Gutiérrez"
    correo: "pena.gutierrez.ayudante.bol.oruro@terminalhub.bo"
    telefono: "+591 79901234"
    fecha_nacimiento: "2000-09-30"
    licencia_tipo: "Particular T"

🏢 Cosmos (COS) — 8 buses
- id: BUS-COS-001
  placa: "39X1YZ"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Volvo"
  modelo: "B450R"
  anio: 2022
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2027-01456"
    vencimiento: "2027-02-08"
  inspeccion:
    numero: "INS-2027-13456"
    vencimiento: "2027-07-14"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Vacaflor"
    apellido: "Vaca"
    correo: "vacaflor.vaca.conductor.cos.lapaz@terminalhub.bo"
    telefono: "+591 80012345"
    fecha_nacimiento: "1976-08-22"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Arce"
    apellido: "Mendoza"
    correo: "arce.mendoza.ayudante.cos.lapaz@terminalhub.bo"
    telefono: "+591 80123456"
    fecha_nacimiento: "1998-03-14"
    licencia_tipo: "Particular T"

- id: BUS-COS-002
  placa: "62Y4BC"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Scania"
  modelo: "K440IB"
  anio: 2021
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2026-44567"
    vencimiento: "2026-12-23"
  inspeccion:
    numero: "INS-2027-14567"
    vencimiento: "2027-05-30"
  base: "Cochabamba"
  conductor:
    ci: "7756123 CB"
    nombre: "Quiroga"
    apellido: "Ríos"
    correo: "quiroga.rios.conductor.cos.cochabamba@terminalhub.bo"
    telefono: "+591 80234567"
    fecha_nacimiento: "1979-12-05"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 CB"
    nombre: "Zambrana"
    apellido: "Paz"
    correo: "zambrana.paz.ayudante.cos.cochabamba@terminalhub.bo"
    telefono: "+591 80345678"
    fecha_nacimiento: "2000-06-18"
    licencia_tipo: "Particular T"

- id: BUS-COS-003
  placa: "85A7DE"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Marcopolo"
  modelo: "G7 1200"
  anio: 2020
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-45678"
    vencimiento: "2026-10-11"
  inspeccion:
    numero: "INS-2027-11678"
    vencimiento: "2027-03-06"
  base: "Santa Cruz"
  conductor:
    ci: "2289456 SC"
    nombre: "Mollo"
    apellido: "Soliz"
    correo: "mollo.soliz.conductor.cos.santacruz@terminalhub.bo"
    telefono: "+591 80456789"
    fecha_nacimiento: "1977-04-29"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 SC"
    nombre: "Yujra"
    apellido: "Colque"
    correo: "yujra.colque.ayudante.cos.santacruz@terminalhub.bo"
    telefono: "+591 80567890"
    fecha_nacimiento: "1999-11-07"
    licencia_tipo: "Particular T"

- id: BUS-COS-004
  placa: "18C2FG"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Mercedes-Benz"
  modelo: "O500RS"
  anio: 2019
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "USB", "TV"]
  soat:
    numero: "SOAT-2026-46789"
    vencimiento: "2026-08-29"
  inspeccion:
    numero: "INS-2027-10789"
    vencimiento: "2027-01-20"
  base: "Trinidad"
  conductor:
    ci: "9945678 BE"
    nombre: "Rivera"
    apellido: "Fernández"
    correo: "rivera.fernandez.conductor.cos.trinidad@terminalhub.bo"
    telefono: "+591 80678901"
    fecha_nacimiento: "1980-02-17"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 BE"
    nombre: "Castro"
    apellido: "López"
    correo: "castro.lopez.ayudante.cos.trinidad@terminalhub.bo"
    telefono: "+591 80789012"
    fecha_nacimiento: "2001-08-25"
    licencia_tipo: "Particular T"

- id: BUS-COS-005
  placa: "44E5HJ"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Neobus"
  modelo: "Mega Plus"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2027-01012"
    vencimiento: "2027-01-06"
  inspeccion:
    numero: "INS-2027-12678"
    vencimiento: "2027-06-19"
  base: "La Paz"
  conductor:
    ci: "1178945 LP"
    nombre: "Herrera"
    apellido: "Chávez"
    correo: "herrera.chavez.conductor.cos.lapaz@terminalhub.bo"
    telefono: "+591 80890123"
    fecha_nacimiento: "1978-10-11"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "7734512 LP"
    nombre: "Medina"
    apellido: "Cruz"
    correo: "medina.cruz.ayudante.cos.lapaz@terminalhub.bo"
    telefono: "+591 80901234"
    fecha_nacimiento: "1997-05-03"
    licencia_tipo: "Particular T"

- id: BUS-COS-006
  placa: "71G8KL"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Comil"
  modelo: "Campione 3.45"
  anio: 2018
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-47890"
    vencimiento: "2026-07-18"
  inspeccion:
    numero: "INS-2026-32345"
    vencimiento: "2026-11-25"
  base: "Cochabamba"
  conductor:
    ci: "4456789 CB"
    nombre: "Céspedes"
    apellido: "Camacho"
    correo: "cespedes.camacho.conductor.cos.cochabamba@terminalhub.bo"
    telefono: "+591 81012345"
    fecha_nacimiento: "1975-06-30"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8823451 CB"
    nombre: "Peña"
    apellido: "Montaño"
    correo: "pena.montano.ayudante.cos.cochabamba@terminalhub.bo"
    telefono: "+591 81123456"
    fecha_nacimiento: "1998-12-15"
    licencia_tipo: "Particular T"

- id: BUS-COS-007
  placa: "93J3MN"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Volvo"
  modelo: "B420R"
  anio: 2022
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2027-02567"
    vencimiento: "2027-04-17"
  inspeccion:
    numero: "INS-2027-15678"
    vencimiento: "2027-10-03"
  base: "Santa Cruz"
  conductor:
    ci: "3367812 SC"
    nombre: "Núñez"
    apellido: "Cabrera"
    correo: "nunez.cabrera.conductor.cos.santacruz@terminalhub.bo"
    telefono: "+591 81234567"
    fecha_nacimiento: "1981-09-22"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "9912378 SC"
    nombre: "Miranda"
    apellido: "Jiménez"
    correo: "miranda.jimenez.ayudante.cos.santacruz@terminalhub.bo"
    telefono: "+591 81345678"
    fecha_nacimiento: "2000-04-08"
    licencia_tipo: "Particular T"

- id: BUS-COS-008
  placa: "26L6OP"
  empresa: "Cosmos"
  empresa_codigo: "COS"
  marca: "Scania"
  modelo: "F420HB"
  anio: 2020
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "TV"]
  soat:
    numero: "SOAT-2026-48901"
    vencimiento: "2026-11-28"
  inspeccion:
    numero: "INS-2027-13789"
    vencimiento: "2027-04-25"
  base: "Trinidad"
  conductor:
    ci: "5543217 BE"
    nombre: "Vacaflor"
    apellido: "Ramírez"
    correo: "vacaflor.ramirez.conductor.cos.trinidad@terminalhub.bo"
    telefono: "+591 81456789"
    fecha_nacimiento: "1977-11-14"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "1187654 BE"
    nombre: "Arce"
    apellido: "Terrazas"
    correo: "arce.terrazas.ayudante.cos.trinidad@terminalhub.bo"
    telefono: "+591 81567890"
    fecha_nacimiento: "1999-07-27"
    licencia_tipo: "Particular T"

🏢 Emperador (EMP) — 10 buses
- id: BUS-EMP-001
  placa: "49N9QR"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Volvo"
  modelo: "B450R"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2026-49012"
    vencimiento: "2026-12-02"
  inspeccion:
    numero: "INS-2027-13890"
    vencimiento: "2027-05-08"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Quiroga"
    apellido: "Villarroel"
    correo: "quiroga.villarroel.conductor.emp.lapaz@terminalhub.bo"
    telefono: "+591 81678901"
    fecha_nacimiento: "1978-07-16"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Zambrana"
    apellido: "Salvatierra"
    correo: "zambrana.salvatierra.ayudante.emp.lapaz@terminalhub.bo"
    telefono: "+591 81789012"
    fecha_nacimiento: "1997-02-28"
    licencia_tipo: "Particular T"

- id: BUS-EMP-002
  placa: "75Q4ST"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Scania"
  modelo: "K400IB"
  anio: 2020
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2026-50123"
    vencimiento: "2026-10-26"
  inspeccion:
    numero: "INS-2027-11890"
    vencimiento: "2027-03-14"
  base: "Sucre"
  conductor:
    ci: "7756123 CH"
    nombre: "Mollo"
    apellido: "Durán"
    correo: "mollo.duran.conductor.emp.sucre@terminalhub.bo"
    telefono: "+591 81890123"
    fecha_nacimiento: "1976-03-09"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 CH"
    nombre: "Yujra"
    apellido: "Parada"
    correo: "yujra.parada.ayudante.emp.sucre@terminalhub.bo"
    telefono: "+591 81901234"
    fecha_nacimiento: "1999-08-21"
    licencia_tipo: "Particular T"

- id: BUS-EMP-003
  placa: "12S7UV"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Mercedes-Benz"
  modelo: "O500RSD"
  anio: 2019
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "USB", "TV"]
  soat:
    numero: "SOAT-2026-51234"
    vencimiento: "2026-09-09"
  inspeccion:
    numero: "INS-2027-10890"
    vencimiento: "2027-02-01"
  base: "Potosí"
  conductor:
    ci: "2289456 PT"
    nombre: "Rivera"
    apellido: "Suárez"
    correo: "rivera.suarez.conductor.emp.potosi@terminalhub.bo"
    telefono: "+591 82012345"
    fecha_nacimiento: "1980-12-04"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 PT"
    nombre: "Castro"
    apellido: "Apaza"
    correo: "castro.apaza.ayudante.emp.potosi@terminalhub.bo"
    telefono: "+591 82123456"
    fecha_nacimiento: "2001-05-17"
    licencia_tipo: "Particular T"

- id: BUS-EMP-004
  placa: "38U2WX"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Marcopolo"
  modelo: "Paradiso 1200"
  anio: 2022
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2027-02012"
    vencimiento: "2027-03-21"
  inspeccion:
    numero: "INS-2027-14890"
    vencimiento: "2027-08-29"
  base: "Oruro"
  conductor:
    ci: "9945678 OR"
    nombre: "Herrera"
    apellido: "Vega"
    correo: "herrera.vega.conductor.emp.oruro@terminalhub.bo"
    telefono: "+591 82234567"
    fecha_nacimiento: "1977-05-27"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 OR"
    nombre: "Medina"
    apellido: "Salinas"
    correo: "medina.salinas.ayudante.emp.oruro@terminalhub.bo"
    telefono: "+591 82345678"
    fecha_nacimiento: "1998-10-12"
    licencia_tipo: "Particular T"

- id: BUS-EMP-005
  placa: "64V5YZ"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Busscar"
  modelo: "Vistabuss"
  anio: 2018
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-52345"
    vencimiento: "2026-07-27"
    alerta: "VENCIDO"
  inspeccion:
    numero: "INS-2026-33456"
    vencimiento: "2026-11-13"
  base: "La Paz"
  conductor:
    ci: "1178945 LP"
    nombre: "Céspedes"
    apellido: "Rivera"
    correo: "cespedes.rivera.conductor.emp.lapaz@terminalhub.bo"
    telefono: "+591 82456789"
    fecha_nacimiento: "1975-09-18"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "7734512 LP"
    nombre: "Peña"
    apellido: "Ortiz"
    correo: "pena.ortiz.ayudante.emp.lapaz@terminalhub.bo"
    telefono: "+591 82567890"
    fecha_nacimiento: "1997-03-04"
    licencia_tipo: "Particular T"

- id: BUS-EMP-006
  placa: "89W8BC"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Neobus"
  modelo: "Thunder +"
  anio: 2021
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "A/C", "USB", "Baño"]
  soat:
    numero: "SOAT-2027-01123"
    vencimiento: "2027-01-30"
  inspeccion:
    numero: "INS-2027-12890"
    vencimiento: "2027-06-22"
  base: "Sucre"
  conductor:
    ci: "4456789 CH"
    nombre: "Núñez"
    apellido: "Castro"
    correo: "nunez.castro.conductor.emp.sucre@terminalhub.bo"
    telefono: "+591 82678901"
    fecha_nacimiento: "1982-04-15"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8823451 CH"
    nombre: "Miranda"
    apellido: "Morales"
    correo: "miranda.morales.ayudante.emp.sucre@terminalhub.bo"
    telefono: "+591 82789012"
    fecha_nacimiento: "2000-11-28"
    licencia_tipo: "Particular T"

- id: BUS-EMP-007
  placa: "15X3DE"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Scania"
  modelo: "K360IB"
  anio: 2020
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-53456"
    vencimiento: "2026-11-05"
  inspeccion:
    numero: "INS-2027-12012"
    vencimiento: "2027-04-02"
  base: "Potosí"
  conductor:
    ci: "3367812 PT"
    nombre: "Vacaflor"
    apellido: "Quispe"
    correo: "vacaflor.quispe.conductor.emp.potosi@terminalhub.bo"
    telefono: "+591 82890123"
    fecha_nacimiento: "1979-08-23"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "9912378 PT"
    nombre: "Arce"
    apellido: "Mamani"
    correo: "arce.mamani.ayudante.emp.potosi@terminalhub.bo"
    telefono: "+591 82901234"
    fecha_nacimiento: "1998-01-10"
    licencia_tipo: "Particular T"

- id: BUS-EMP-008
  placa: "41Y6FG"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Volvo"
  modelo: "B420R"
  anio: 2019
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "A/C", "USB", "Calefacción", "Baño"]
  soat:
    numero: "SOAT-2026-54567"
    vencimiento: "2026-10-18"
  inspeccion:
    numero: "INS-2027-10901"
    vencimiento: "2027-01-28"
  base: "Oruro"
  conductor:
    ci: "5543217 OR"
    nombre: "Quiroga"
    apellido: "Choque"
    correo: "quiroga.choque.conductor.emp.oruro@terminalhub.bo"
    telefono: "+591 83012345"
    fecha_nacimiento: "1976-02-06"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "1187654 OR"
    nombre: "Zambrana"
    apellido: "Flores"
    correo: "zambrana.flores.ayudante.emp.oruro@terminalhub.bo"
    telefono: "+591 83123456"
    fecha_nacimiento: "1999-06-19"
    licencia_tipo: "Particular T"

- id: BUS-EMP-009
  placa: "67A9HJ"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Comil"
  modelo: "Campione Vision"
  anio: 2022
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2027-03456"
    vencimiento: "2027-05-14"
  inspeccion:
    numero: "INS-2027-15890"
    vencimiento: "2027-10-20"
  base: "La Paz"
  conductor:
    ci: "6678923 LP"
    nombre: "Mollo"
    apellido: "Vargas"
    correo: "mollo.vargas.conductor.emp.lapaz@terminalhub.bo"
    telefono: "+591 83234567"
    fecha_nacimiento: "1981-11-02"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "2245678 LP"
    nombre: "Yujra"
    apellido: "Rojas"
    correo: "yujra.rojas.ayudante.emp.lapaz@terminalhub.bo"
    telefono: "+591 83345678"
    fecha_nacimiento: "2001-04-25"
    licencia_tipo: "Particular T"

- id: BUS-EMP-010
  placa: "93C4KL"
  empresa: "Emperador"
  empresa_codigo: "EMP"
  marca: "Mercedes-Benz"
  modelo: "1833"
  anio: 2017
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción"]
  soat:
    numero: "SOAT-2026-55678"
    vencimiento: "2026-06-10"
    alerta: "VENCIDO"
  inspeccion:
    numero: "INS-2026-34567"
    vencimiento: "2026-10-05"
  base: "Sucre"
  conductor:
    ci: "8891234 CH"
    nombre: "Rivera"
    apellido: "Gutiérrez"
    correo: "rivera.gutierrez.conductor.emp.sucre@terminalhub.bo"
    telefono: "+591 83456789"
    fecha_nacimiento: "1974-07-31"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "4456789 CH"
    nombre: "Castro"
    apellido: "Condori"
    correo: "castro.condori.ayudante.emp.sucre@terminalhub.bo"
    telefono: "+591 83567890"
    fecha_nacimiento: "1997-12-17"
    licencia_tipo: "Particular T"

🏢 Naser (NAS) — 4 buses
- id: BUS-NAS-001
  placa: "28E7MN"
  empresa: "Naser"
  empresa_codigo: "NAS"
  marca: "Volvo"
  modelo: "B340R"
  anio: 2020
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "USB", "TV"]
  soat:
    numero: "SOAT-2026-56789"
    vencimiento: "2026-10-03"
  inspeccion:
    numero: "INS-2027-11901"
    vencimiento: "2027-03-12"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Herrera"
    apellido: "Torrico"
    correo: "herrera.torrico.conductor.nas.lapaz@terminalhub.bo"
    telefono: "+591 83678901"
    fecha_nacimiento: "1978-06-13"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Medina"
    apellido: "Vaca"
    correo: "medina.vaca.ayudante.nas.lapaz@terminalhub.bo"
    telefono: "+591 83789012"
    fecha_nacimiento: "1999-02-26"
    licencia_tipo: "Particular T"

- id: BUS-NAS-002
  placa: "54G2OP"
  empresa: "Naser"
  empresa_codigo: "NAS"
  marca: "Scania"
  modelo: "K400IB"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2027-01234"
    vencimiento: "2027-01-25"
  inspeccion:
    numero: "INS-2027-12901"
    vencimiento: "2027-06-18"
  base: "Cochabamba"
  conductor:
    ci: "7756123 CB"
    nombre: "Céspedes"
    apellido: "Mendoza"
    correo: "cespedes.mendoza.conductor.nas.cochabamba@terminalhub.bo"
    telefono: "+591 83890123"
    fecha_nacimiento: "1977-10-29"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 CB"
    nombre: "Peña"
    apellido: "Ríos"
    correo: "pena.rios.ayudante.nas.cochabamba@terminalhub.bo"
    telefono: "+591 83901234"
    fecha_nacimiento: "2000-05-12"
    licencia_tipo: "Particular T"

- id: BUS-NAS-003
  placa: "79J5QR"
  empresa: "Naser"
  empresa_codigo: "NAS"
  marca: "Marcopolo"
  modelo: "G7 1200"
  anio: 2019
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-57890"
    vencimiento: "2026-09-20"
  inspeccion:
    numero: "INS-2027-11012"
    vencimiento: "2027-02-07"
  base: "Santa Cruz"
  conductor:
    ci: "2289456 SC"
    nombre: "Núñez"
    apellido: "Paz"
    correo: "nunez.paz.conductor.nas.santacruz@terminalhub.bo"
    telefono: "+591 84012345"
    fecha_nacimiento: "1980-01-08"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 SC"
    nombre: "Miranda"
    apellido: "Soliz"
    correo: "miranda.soliz.ayudante.nas.santacruz@terminalhub.bo"
    telefono: "+591 84123456"
    fecha_nacimiento: "1998-08-24"
    licencia_tipo: "Particular T"

- id: BUS-NAS-004
  placa: "15L8ST"
  empresa: "Naser"
  empresa_codigo: "NAS"
  marca: "Neobus"
  modelo: "Mega Plus"
  anio: 2018
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-58901"
    vencimiento: "2026-07-11"
    alerta: "VENCIDO"
  inspeccion:
    numero: "INS-2026-35678"
    vencimiento: "2026-11-22"
  base: "La Paz"
  conductor:
    ci: "9945678 LP"
    nombre: "Vacaflor"
    apellido: "Colque"
    correo: "vacaflor.colque.conductor.nas.lapaz@terminalhub.bo"
    telefono: "+591 84234567"
    fecha_nacimiento: "1975-04-17"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 LP"
    nombre: "Arce"
    apellido: "Fernández"
    correo: "arce.fernandez.ayudante.nas.lapaz@terminalhub.bo"
    telefono: "+591 84345678"
    fecha_nacimiento: "1997-11-05"
    licencia_tipo: "Particular T"

🏢 Atlas 1 (ATL) — 5 buses
- id: BUS-ATL-001
  placa: "41N3UV"
  empresa: "Atlas 1"
  empresa_codigo: "ATL"
  marca: "Scania"
  modelo: "K360IB"
  anio: 2019
  pisos: 1
  categoria: "Semicama"
  amenidades: ["A/C", "USB", "Calefacción", "WiFi"]
  soat:
    numero: "SOAT-2026-59012"
    vencimiento: "2026-10-27"
  inspeccion:
    numero: "INS-2027-10901"
    vencimiento: "2027-01-18"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Quiroga"
    apellido: "López"
    correo: "quiroga.lopez.conductor.atl.lapaz@terminalhub.bo"
    telefono: "+591 84456789"
    fecha_nacimiento: "1979-02-14"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Zambrana"
    apellido: "Chávez"
    correo: "zambrana.chavez.ayudante.atl.lapaz@terminalhub.bo"
    telefono: "+591 84567890"
    fecha_nacimiento: "2000-07-07"
    licencia_tipo: "Particular T"

- id: BUS-ATL-002
  placa: "67Q6WX"
  empresa: "Atlas 1"
  empresa_codigo: "ATL"
  marca: "Mercedes-Benz"
  modelo: "O500RS"
  anio: 2020
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "TV", "USB"]
  soat:
    numero: "SOAT-2026-60123"
    vencimiento: "2026-12-15"
  inspeccion:
    numero: "INS-2027-13901"
    vencimiento: "2027-05-05"
  base: "Oruro"
  conductor:
    ci: "7756123 OR"
    nombre: "Mollo"
    apellido: "Cruz"
    correo: "mollo.cruz.conductor.atl.oruro@terminalhub.bo"
    telefono: "+591 84678901"
    fecha_nacimiento: "1976-11-22"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 OR"
    nombre: "Yujra"
    apellido: "Camacho"
    correo: "yujra.camacho.ayudante.atl.oruro@terminalhub.bo"
    telefono: "+591 84789012"
    fecha_nacimiento: "1998-03-09"
    licencia_tipo: "Particular T"

- id: BUS-ATL-003
  placa: "93S9YZ"
  empresa: "Atlas 1"
  empresa_codigo: "ATL"
  marca: "Volvo"
  modelo: "B340R"
  anio: 2018
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-61234"
    vencimiento: "2026-08-09"
  inspeccion:
    numero: "INS-2026-36789"
    vencimiento: "2026-12-01"
  base: "Cochabamba"
  conductor:
    ci: "2289456 CB"
    nombre: "Rivera"
    apellido: "Montaño"
    correo: "rivera.montano.conductor.atl.cochabamba@terminalhub.bo"
    telefono: "+591 84890123"
    fecha_nacimiento: "1980-05-30"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 CB"
    nombre: "Castro"
    apellido: "Cabrera"
    correo: "castro.cabrera.ayudante.atl.cochabamba@terminalhub.bo"
    telefono: "+591 84901234"
    fecha_nacimiento: "1999-09-14"
    licencia_tipo: "Particular T"

- id: BUS-ATL-004
  placa: "29U4BC"
  empresa: "Atlas 1"
  empresa_codigo: "ATL"
  marca: "Busscar"
  modelo: "Vistabuss"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2027-01567"
    vencimiento: "2027-02-22"
  inspeccion:
    numero: "INS-2027-14901"
    vencimiento: "2027-07-30"
  base: "La Paz"
  conductor:
    ci: "9945678 LP"
    nombre: "Herrera"
    apellido: "Jiménez"
    correo: "herrera.jimenez.conductor.atl.lapaz@terminalhub.bo"
    telefono: "+591 85012345"
    fecha_nacimiento: "1977-08-16"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 LP"
    nombre: "Medina"
    apellido: "Ramírez"
    correo: "medina.ramirez.ayudante.atl.lapaz@terminalhub.bo"
    telefono: "+591 85123456"
    fecha_nacimiento: "2000-12-03"
    licencia_tipo: "Particular T"

- id: BUS-ATL-005
  placa: "55W7DE"
  empresa: "Atlas 1"
  empresa_codigo: "ATL"
  marca: "Comil"
  modelo: "Campione 3.45"
  anio: 2019
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "A/C", "USB", "Calefacción", "Baño"]
  soat:
    numero: "SOAT-2026-62345"
    vencimiento: "2026-11-08"
  inspeccion:
    numero: "INS-2027-13012"
    vencimiento: "2027-04-15"
  base: "Oruro"
  conductor:
    ci: "1178945 OR"
    nombre: "Céspedes"
    apellido: "Terrazas"
    correo: "cespedes.terrazas.conductor.atl.oruro@terminalhub.bo"
    telefono: "+591 85234567"
    fecha_nacimiento: "1981-03-25"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "7734512 OR"
    nombre: "Peña"
    apellido: "Villarroel"
    correo: "pena.villarroel.ayudante.atl.oruro@terminalhub.bo"
    telefono: "+591 85345678"
    fecha_nacimiento: "1998-10-18"
    licencia_tipo: "Particular T"

🏢 Trans. Andino S.A. (AND) — 6 buses
- id: BUS-AND-001
  placa: "78Y2FG"
  empresa: "Trans. Andino S.A."
  empresa_codigo: "AND"
  marca: "Scania"
  modelo: "K400IB"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2027-01345"
    vencimiento: "2027-01-12"
  inspeccion:
    numero: "INS-2027-12012"
    vencimiento: "2027-06-08"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Núñez"
    apellido: "Salvatierra"
    correo: "nunez.salvatierra.conductor.and.lapaz@terminalhub.bo"
    telefono: "+591 85456789"
    fecha_nacimiento: "1978-09-05"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Miranda"
    apellido: "Durán"
    correo: "miranda.duran.ayudante.and.lapaz@terminalhub.bo"
    telefono: "+591 85567890"
    fecha_nacimiento: "1997-04-20"
    licencia_tipo: "Particular T"

- id: BUS-AND-002
  placa: "14A5HJ"
  empresa: "Trans. Andino S.A."
  empresa_codigo: "AND"
  marca: "Volvo"
  modelo: "B420R"
  anio: 2020
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "USB", "TV"]
  soat:
    numero: "SOAT-2026-63456"
    vencimiento: "2026-10-20"
  inspeccion:
    numero: "INS-2027-11123"
    vencimiento: "2027-03-09"
  base: "Oruro"
  conductor:
    ci: "7756123 OR"
    nombre: "Vacaflor"
    apellido: "Parada"
    correo: "vacaflor.parada.conductor.and.oruro@terminalhub.bo"
    telefono: "+591 85678901"
    fecha_nacimiento: "1976-06-17"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 OR"
    nombre: "Arce"
    apellido: "Suárez"
    correo: "arce.suarez.ayudante.and.oruro@terminalhub.bo"
    telefono: "+591 85789012"
    fecha_nacimiento: "1999-01-08"
    licencia_tipo: "Particular T"

- id: BUS-AND-003
  placa: "37C8KL"
  empresa: "Trans. Andino S.A."
  empresa_codigo: "AND"
  marca: "Mercedes-Benz"
  modelo: "O500RSD"
  anio: 2019
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-64567"
    vencimiento: "2026-09-13"
  inspeccion:
    numero: "INS-2027-11234"
    vencimiento: "2027-02-05"
  base: "Potosí"
  conductor:
    ci: "2289456 PT"
    nombre: "Quiroga"
    apellido: "Apaza"
    correo: "quiroga.apaza.conductor.and.potosi@terminalhub.bo"
    telefono: "+591 85890123"
    fecha_nacimiento: "1980-10-26"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 PT"
    nombre: "Zambrana"
    apellido: "Vega"
    correo: "zambrana.vega.ayudante.and.potosi@terminalhub.bo"
    telefono: "+591 85901234"
    fecha_nacimiento: "2001-03-11"
    licencia_tipo: "Particular T"

- id: BUS-AND-004
  placa: "63E1MN"
  empresa: "Trans. Andino S.A."
  empresa_codigo: "AND"
  marca: "Marcopolo"
  modelo: "Paradiso 1200"
  anio: 2022
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2027-02123"
    vencimiento: "2027-03-04"
  inspeccion:
    numero: "INS-2027-14901"
    vencimiento: "2027-08-21"
  base: "La Paz"
  conductor:
    ci: "9945678 LP"
    nombre: "Mollo"
    apellido: "Salinas"
    correo: "mollo.salinas.conductor.and.lapaz@terminalhub.bo"
    telefono: "+591 86012345"
    fecha_nacimiento: "1977-12-19"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 LP"
    nombre: "Yujra"
    apellido: "Rivera"
    correo: "yujra.rivera.ayudante.and.lapaz@terminalhub.bo"
    telefono: "+591 86123456"
    fecha_nacimiento: "1998-07-02"
    licencia_tipo: "Particular T"

- id: BUS-AND-005
  placa: "89G4OP"
  empresa: "Trans. Andino S.A."
  empresa_codigo: "AND"
  marca: "Neobus"
  modelo: "Mega Plus"
  anio: 2018
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-65678"
    vencimiento: "2026-07-02"
    alerta: "VENCIDO"
  inspeccion:
    numero: "INS-2026-37890"
    vencimiento: "2026-10-28"
  base: "Oruro"
  conductor:
    ci: "1178945 OR"
    nombre: "Rivera"
    apellido: "Ortiz"
    correo: "rivera.ortiz.conductor.and.oruro@terminalhub.bo"
    telefono: "+591 86234567"
    fecha_nacimiento: "1975-01-14"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "7734512 OR"
    nombre: "Castro"
    apellido: "Castro"
    correo: "castro.castro.ayudante.and.oruro@terminalhub.bo"
    telefono: "+591 86345678"
    fecha_nacimiento: "1997-06-29"
    licencia_tipo: "Particular T"

- id: BUS-AND-006
  placa: "25J7QR"
  empresa: "Trans. Andino S.A."
  empresa_codigo: "AND"
  marca: "Scania"
  modelo: "F420HB"
  anio: 2020
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "USB"]
  soat:
    numero: "SOAT-2026-66789"
    vencimiento: "2026-11-22"
  inspeccion:
    numero: "INS-2027-13123"
    vencimiento: "2027-04-17"
  base: "Potosí"
  conductor:
    ci: "4456789 PT"
    nombre: "Herrera"
    apellido: "Morales"
    correo: "herrera.morales.conductor.and.potosi@terminalhub.bo"
    telefono: "+591 86456789"
    fecha_nacimiento: "1982-08-07"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8823451 PT"
    nombre: "Medina"
    apellido: "Quispe"
    correo: "medina.quispe.ayudante.and.potosi@terminalhub.bo"
    telefono: "+591 86567890"
    fecha_nacimiento: "2000-02-22"
    licencia_tipo: "Particular T"

🏢 Imperial (IMP) — 5 buses
- id: BUS-IMP-001
  placa: "48L2ST"
  empresa: "Imperial"
  empresa_codigo: "IMP"
  marca: "Volvo"
  modelo: "B450R"
  anio: 2021
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción"]
  soat:
    numero: "SOAT-2026-67890"
    vencimiento: "2026-12-28"
  inspeccion:
    numero: "INS-2027-14012"
    vencimiento: "2027-05-22"
  base: "La Paz"
  conductor:
    ci: "4423567 LP"
    nombre: "Céspedes"
    apellido: "Mamani"
    correo: "cespedes.mamani.conductor.imp.lapaz@terminalhub.bo"
    telefono: "+591 86678901"
    fecha_nacimiento: "1979-04-11"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "8812345 LP"
    nombre: "Peña"
    apellido: "Choque"
    correo: "pena.choque.ayudante.imp.lapaz@terminalhub.bo"
    telefono: "+591 86789012"
    fecha_nacimiento: "1998-11-23"
    licencia_tipo: "Particular T"

- id: BUS-IMP-002
  placa: "74N5UV"
  empresa: "Imperial"
  empresa_codigo: "IMP"
  marca: "Scania"
  modelo: "K440IB"
  anio: 2020
  pisos: 2
  categoria: "Cama Ejecutivo"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "Refrigerador", "GPS"]
  soat:
    numero: "SOAT-2026-68901"
    vencimiento: "2026-11-14"
  inspeccion:
    numero: "INS-2027-13234"
    vencimiento: "2027-04-10"
  base: "Potosí"
  conductor:
    ci: "7756123 PT"
    nombre: "Núñez"
    apellido: "Flores"
    correo: "nunez.flores.conductor.imp.potosi@terminalhub.bo"
    telefono: "+591 86890123"
    fecha_nacimiento: "1976-07-28"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "3398745 PT"
    nombre: "Miranda"
    apellido: "Vargas"
    correo: "miranda.vargas.ayudante.imp.potosi@terminalhub.bo"
    telefono: "+591 86901234"
    fecha_nacimiento: "1999-03-16"
    licencia_tipo: "Particular T"

- id: BUS-IMP-003
  placa: "16Q8WX"
  empresa: "Imperial"
  empresa_codigo: "IMP"
  marca: "Mercedes-Benz"
  modelo: "O500RS"
  anio: 2019
  pisos: 2
  categoria: "Semicama"
  amenidades: ["WiFi", "Baño", "A/C", "TV", "USB"]
  soat:
    numero: "SOAT-2026-69012"
    vencimiento: "2026-10-07"
  inspeccion:
    numero: "INS-2027-11345"
    vencimiento: "2027-03-01"
  base: "Sucre"
  conductor:
    ci: "2289456 CH"
    nombre: "Vacaflor"
    apellido: "Rojas"
    correo: "vacaflor.rojas.conductor.imp.sucre@terminalhub.bo"
    telefono: "+591 87012345"
    fecha_nacimiento: "1980-02-03"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "6634521 CH"
    nombre: "Arce"
    apellido: "Gutiérrez"
    correo: "arce.gutierrez.ayudante.imp.sucre@terminalhub.bo"
    telefono: "+591 87123456"
    fecha_nacimiento: "2001-09-18"
    licencia_tipo: "Particular T"

- id: BUS-IMP-004
  placa: "32T1YZ"
  empresa: "Imperial"
  empresa_codigo: "IMP"
  marca: "Marcopolo"
  modelo: "G7 1200"
  anio: 2022
  pisos: 2
  categoria: "Cama"
  amenidades: ["WiFi", "Baño", "TV", "A/C", "USB", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2027-01678"
    vencimiento: "2027-02-15"
  inspeccion:
    numero: "INS-2027-14123"
    vencimiento: "2027-07-28"
  base: "La Paz"
  conductor:
    ci: "9945678 LP"
    nombre: "Quiroga"
    apellido: "Condori"
    correo: "quiroga.condori.conductor.imp.lapaz@terminalhub.bo"
    telefono: "+591 87234567"
    fecha_nacimiento: "1977-10-19"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "5512347 LP"
    nombre: "Zambrana"
    apellido: "Torrico"
    correo: "zambrana.torrico.ayudante.imp.lapaz@terminalhub.bo"
    telefono: "+591 87345678"
    fecha_nacimiento: "1998-05-05"
    licencia_tipo: "Particular T"

- id: BUS-IMP-005
  placa: "59U4BC"
  empresa: "Imperial"
  empresa_codigo: "IMP"
  marca: "Busscar"
  modelo: "Panoramico DD"
  anio: 2018
  pisos: 1
  categoria: "Estándar"
  amenidades: ["A/C", "Calefacción", "GPS"]
  soat:
    numero: "SOAT-2026-70123"
    vencimiento: "2026-07-23"
    alerta: "VENCIDO"
  inspeccion:
    numero: "INS-2026-38901"
    vencimiento: "2026-11-09"
  base: "Potosí"
  conductor:
    ci: "1178945 PT"
    nombre: "Mollo"
    apellido: "Vaca"
    correo: "mollo.vaca.conductor.imp.potosi@terminalhub.bo"
    telefono: "+591 87456789"
    fecha_nacimiento: "1975-08-14"
    licencia_tipo: "Profesional A"
  ayudante:
    ci: "7734512 PT"
    nombre: "Yujra"
    apellido: "Mendoza"
    correo: "yujra.mendoza.ayudante.imp.potosi@terminalhub.bo"
    telefono: "+591 87567890"
    fecha_nacimiento: "1997-01-27"
    licencia_tipo: "Particular T"

Acciones sugeridas para Claude Code
# 1. Parsear ambos archivos YAML/Markdown
# 2. Generar migración SQL para Supabase con estas tablas:
#    - empresas
#    - terminales  
#    - buses
#    - personal (conductores + ayudantes)
#    - asignaciones_bus_personal
#    - credenciales
# 3. Generar script seed con los 96 buses
# 4. Configurar autenticación con:
#    - Password hash de "TerminalHub2026!" (bcrypt)
#    - Emails únicos por empleado
# 5. Vincular buses a horarios del archivo horarios_buses_v6.md
#    - Cada bus hace rutas específicas según su base
#    - Validar que la categoría del bus coincida con el servicio del horario

Validaciones clave que Claude Code debe implementar
validaciones:
  - "Todo bus con categoria 'Cama' o 'Cama Ejecutivo' o 'Cama Suite' debe tener amenidades: WiFi, Baño, TV, A/C"
  - "Todo bus con pisos=1 solo puede ser categoria 'Estándar' o 'Semicama'"
  - "Todo bus con pisos=2 debe tener categoria >= 'Semicama'"
  - "SOAT vencido: fecha < 2026-05-26 debe generar alerta en el sistema"
  - "Inspección vencida: fecha < 2026-05-26 debe bloquear el bus de circulación"
  - "Conductor y ayudante deben tener licencia_tipo válida para el rol"
  - "Cada bus debe tener exactamente 1 conductor y 1 ayudante asignado"
  - "La base del bus debe coincidir con el departamento de las rutas asignadas"

Conexión con horarios_buses_v6.md
mapeo_rutas:
  - "COP: opera en LPZ, CBB, SCZ, OR, TJ, CH"
  - "DOR: opera en LPZ, CBB, SCZ, PT, CH, TJ"
  - "ILL: opera en LPZ, PT, CH"
  - "BOL: opera en LPZ, CBB, SCZ, OR, TJ"
  - "COS: opera en LPZ, CBB, SCZ, BE (Trinidad)"
  - "EMP: opera en LPZ, CH, PT, OR"
  - "NAS: opera en LPZ, CBB, SCZ"
  - "ATL: opera en LPZ, OR, CBB"
  - "AND: opera en LPZ, OR, PT"
  - "IMP: opera en LPZ, PT, CH"
