import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder-key';
const supabase = supabaseUrl && supabaseKey && supabaseUrl !== 'https://placeholder.supabase.co'
  ? createClient(supabaseUrl, supabaseKey)
  : null;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../Frontend')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', port: PORT, db: !!supabase });
});

const requireSupabase = (res) => {
  if (!supabase) {
    res.status(503).json({ detail: 'Supabase no está configurado. Define SUPABASE_URL y SUPABASE_KEY.' });
    return false;
  }
  return true;
};

// ==================================================================
// ENDPOINT: REGISTRO DE USUARIOS
// ==================================================================
app.post('/api/registro', async (req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { nombre_completo, email, password, rol } = req.body;

    if (!nombre_completo || !email || !password) {
      return res.status(400).json({ detail: 'Faltan campos obligatorios' });
    }

    // 1. Obtener todos los IDs para encontrar el correlativo más alto
    const { data: usuarios, error: errFetch } = await supabase
      .from('usuario')
      .select('usuario_id');

    if (errFetch) throw errFetch;

    // 2. Extraer el número correlativo (US001, US002...)
    let maxNum = 0;
    if (usuarios && usuarios.length > 0) {
      usuarios.forEach(u => {
        if (u.usuario_id && u.usuario_id.startsWith('US')) {
          const num = Number.parseInt(u.usuario_id.replace('US', ''), 10);
          if (!Number.isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
    }

    // 3. Formatear el nuevo ID
    const siguienteNumero = maxNum + 1;
    const usuarioIdCorrelativo = `US${String(siguienteNumero).padStart(3, '0')}`;

    // 4. Normalizar el rol
    let rolFormateado = 'Operator';
    if (rol && (rol.toLowerCase() === 'admin' || rol.toLowerCase() === 'administrador')) {
      rolFormateado = 'Admin';
    }

    // 5. Mapear datos exactamente a la tabla
    const nuevoUsuario = {
      usuario_id: usuarioIdCorrelativo,
      nombre_completo: nombre_completo.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      password_hash: `$2b$12$elmiTXuWVxfm37uY4JANJ.${password}`,
      rol: rolFormateado,
      fecha_creacion: new Date().toISOString()
    };

    // 6. Insertar en Supabase
    const { data, error } = await supabase
      .from('usuario')
      .insert([nuevoUsuario])
      .select();

    if (error) throw error;

    return res.status(201).json({ status: 'ok', data });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({ detail: error.message || 'Error al guardar en BD' });
  }
});

// ==================================================================
// ENDPOINT: INICIO DE SESIÓN
// ==================================================================
app.post('/api/login', async (req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ detail: 'Debe ingresar correo y contraseña' });
    }

    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      return res.status(401).json({ detail: 'Usuario no encontrado' });
    }

    if (data.password !== password) {
      return res.status(401).json({ detail: 'Credenciales incorrectas' });
    }

    return res.status(200).json({
      status: 'ok',
      usuario: {
        usuario_id: data.usuario_id,
        nombre_completo: data.nombre_completo,
        email: data.email,
        rol: data.rol,
        fecha_creacion: data.fecha_creacion
      }
    });
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ detail: error.message || 'Error al iniciar sesión' });
  }
});

// ==================================================================
// ENDPOINTS DE TELEMETRÍA Y CONSULTAS REST
// ==================================================================

// KPIs para el Dashboard
app.get('/api/kpis', async (_req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { count: nodosActivos, error: errNodos } = await supabase
      .from('hardware')
      .select('*', { count: 'exact', head: true })
      .eq('estado', 'activo');

    if (errNodos) throw errNodos;

    const { data: logs, error: errLogs } = await supabase
      .from('logs')
      .select('cpu_utilization_pct, ram_utilization_pct, energia_watts')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (errLogs) throw errLogs;

    let totalWatts = 0;
    let cpuAvg = 0;
    let ramAvg = 0;

    if (logs && logs.length > 0) {
      const sumWatts = logs.reduce((acc, curr) => acc + (Number(curr.energia_watts) || 0), 0);
      const sumCpu = logs.reduce((acc, curr) => acc + (Number(curr.cpu_utilization_pct) || 0), 0);
      const sumRam = logs.reduce((acc, curr) => acc + (Number(curr.ram_utilization_pct) || 0), 0);

      totalWatts = Math.round(sumWatts / logs.length);
      cpuAvg = Math.round(sumCpu / logs.length);
      ramAvg = Math.round(sumRam / logs.length);
    }

    res.json({
      nodosActivos: nodosActivos || 0,
      totalWatts,
      cpuAvg,
      ramAvg
    });
  } catch (error) {
    console.error('Error al obtener KPIs:', error);
    res.status(500).json({ error: 'Error al obtener los KPIs' });
  }
});

// Lista de Usuarios
app.get('/api/usuarios', async (_req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('usuario_id', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al consultar la tabla usuario' });
  }
});

// Lista de Hardware / Servidores
app.get('/api/hardware', async (_req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { data, error } = await supabase
      .from('hardware')
      .select('*, usuario:usuario_id(nombre_completo)')
      .order('hardware_id', { ascending: true });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error al obtener hardware:', error);
    res.status(500).json({ error: 'Error al consultar la tabla hardware' });
  }
});

// Logs de Telemetría
app.get('/api/logs', async (_req, res) => {
  if (!requireSupabase(res)) return;

  try {
    const { data, error } = await supabase
      .from('logs')
      .select('*, hardware:hardware_id(hostname)')
      .order('timestamp', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error al obtener logs:', error);
    res.status(500).json({ error: 'Error al consultar la tabla logs' });
  }
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Green AI corriendo en: http://localhost:${PORT}`);
});