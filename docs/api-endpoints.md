
# 📌 NutriFit AI Pro - API Documentation

Base URL: `https://api.nutrifit.ai/v1`

## 🔐 Autenticación
- `POST /auth/register` - Registro de nuevos usuarios.
- `POST /auth/login` - Inicio de sesión (Retorna JWT).
- `POST /auth/onboarding` - Registro inicial de biometría.

## 🤖 Inteligencia Artificial (Gemini)
- `POST /ai/analyze-food` - Recibe imagen (base64/multipart) -> Retorna JSON nutricional.
- `POST /ai/chat` - Chat con contexto nutricional.
- `GET /ai/weekly-plan` - Genera/Obtiene el plan de la semana.

## 📈 Progreso y Métricas
- `GET /progress/logs` - Obtiene historial de peso y medidas.
- `POST /progress/logs` - Crea un nuevo registro diario.
- `GET /progress/stats` - Retorna datos formateados para Recharts.

## 💳 Pagos y Suscripciones (Stripe)
- `POST /payments/checkout` - Crea sesión de pago.
- `POST /payments/webhook` - Escucha eventos de Stripe (Suscripción pagada/cancelada).

## 👥 Comunidad y Admin
- `GET /community/feed` - Obtiene posts anónimos para clientes.
- `POST /community/post` - Publica un logro (Otorga +10 tokens).
- `GET /admin/users` - (Admin Only) Directorio de clientes.
- `POST /admin/message` - (Admin Only) Envía mensaje al buzón de un cliente.
