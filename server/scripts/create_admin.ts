import supabase from '../src/config/db';

const email = 'adminmaster@gmail.com';
const password = '123456';

async function createAdmin() {
    console.log(`🚀 Intentando crear superadmin: ${email}...`);

    // 1. Crear usuario en Supabase Auth (usando el admin API)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name: 'Admin Master' }
    });

    if (authError) {
        if (authError.message.toLowerCase().includes('already') || authError.status === 422) {
            console.log('⚠️ El usuario ya existe en Auth. Obteniendo ID para sincronizar...');
            const { data: existingUser, error: listError } = await supabase.auth.admin.listUsers();
            if (listError) {
                console.error('❌ Error al listar usuarios:', listError.message);
                return;
            }
            const user = existingUser.users.find(u => u.email === email);
            if (user) {
                await syncPublicUser(user.id);
            } else {
                console.error('❌ No se encontró el usuario en la lista de Auth.');
            }
        } else {
            console.error('❌ Error en Auth:', authError.message);
        }
        return;
    }

    if (authData.user) {
        console.log('✅ Usuario creado en Supabase Auth.');
        await syncPublicUser(authData.user.id);
    }
}

async function syncPublicUser(userId: string) {
    console.log('🔄 Intentando sincronizar tabla public.users...');
    
    // Intento 1: Todos los campos
    const { error: dbError } = await supabase
        .from('users')
        .upsert({
            id: userId,
            email,
            name: 'Admin Master',
            role: 'superadmin',
            plan_type: 'pro_master',
            status: 'active'
        });

    if (!dbError) {
        console.log('✅ Usuario superadmin sincronizado correctamente.');
        return;
    }

    console.log(`⚠️ Falló el insert inicial: ${dbError.message}`);
    
    // Intento 2: Mínimos campos (id, email, name, role)
    console.log('🔄 Reintentando con campos mínimos (id, email, name, role)...');
    const { error: dbError2 } = await supabase
        .from('users')
        .upsert({
            id: userId,
            email,
            name: 'Admin Master',
            role: 'superadmin'
        });

    if (!dbError2) {
        console.log('✅ Usuario superadmin sincronizado (sin status ni plan_type).');
        return;
    }

    console.error('❌ Error persistente al sincronizar public.users:', dbError2.message);
    console.log('\nPosibles causas:');
    console.log('1. No se ha ejecutado el archivo schema.sql en el Editor de Supabase.');
    console.log('2. La tabla "users" existe pero con una estructura diferente.');
}

createAdmin();
