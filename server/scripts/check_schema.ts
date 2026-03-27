import supabase from '../src/config/db';

async function checkSchema() {
    console.log('🔍 Verificando columnas de la tabla "users"...');
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
        console.error('❌ Error al consultar la tabla users:', error.message);
        return;
    }

    if (data && data.length >= 0) {
        const columns = data.length > 0 ? Object.keys(data[0]) : 'Sin datos para inferir columnas';
        console.log('✅ Columnas detectadas:', columns);
        
        // Intentar un insert sin la columna status si no existe
        if (data.length === 0) {
            console.log('Información: La tabla está vacía, no se pueden inferir columnas desde un select * si no hay registros.');
        }
    }
}

checkSchema();
