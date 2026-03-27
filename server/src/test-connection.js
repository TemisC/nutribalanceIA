const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Cargar .env
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testConnection() {
  console.log("--- Test de Conexión Supabase (JS) ---");
  
  if (!supabaseUrl || !supabaseKey) {
    console.error("Error: Faltan variables en el .env");
    console.log("SUPABASE_URL:", supabaseUrl ? "OK" : "MISSING");
    console.log("SUPABASE_SERVICE_ROLE_KEY:", supabaseKey ? "OK" : "MISSING");
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Check if we can reach the API
    const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.code === '42P01') {
        console.log("Conexión: EXITOSA ✅ (Pero las tablas aún no existen, lo cual es normal)");
      } else {
        console.error("Error de conexión:", error.message);
        console.error("Código de error:", error.code);
      }
    } else {
      console.log("Conexión: EXITOSA ✅ (Tablas detectadas)");
    }
  } catch (err) {
    console.error("Error inesperado:", err.message);
  }
}

testConnection();
