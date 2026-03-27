import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Cargar .env desde la carpeta actual
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testConnection() {
  console.log("--- Test de Conexión Supabase ---");
  console.log("URL:", supabaseUrl ? "Detectada ✅" : "No detectada ❌");
  console.log("KEY:", supabaseKey ? "Detectada ✅" : "No detectada ❌");

  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Faltan variables en el .env");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        process.stdout.write("Conexión: EXITOSA ✅ (Pero las tablas aún no existen, lo cual es normal)\n");
      } else {
        console.error("Error de conexión:", error.message);
      }
    } else {
      console.log("Conexión: EXITOSA ✅ (Tablas detectadas)");
    }
  } catch (err: any) {
    console.error("Error inesperado:", err.message);
  }
}

testConnection();
