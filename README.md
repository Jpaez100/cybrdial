# CybrDial

Aplicación de comunicaciones basada en Next.js App Router, TypeScript, Tailwind
CSS, Prisma y Twilio. Incluye autenticación JWT con cookies HTTP-only, gestión
de contactos, envío y recepción de SMS, y el inicio de un panel de control.

## Requisitos

- Node.js 20 o posterior
- PostgreSQL
- Una cuenta de Twilio para habilitar llamadas y SMS

## Configuración local

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env`, establece una `AUTH_SECRET` aleatoria de al
   menos 32 bytes, y completa las credenciales de PostgreSQL y Twilio.
3. Genera el cliente de Prisma con `npm run db:generate`.
4. Aplica el esquema a la base de datos configurada con `npm run db:push`.
5. Inicia el servidor con `npm run dev`.

Para crear el usuario demo, establece un valor único y seguro de al menos 12
bytes en `DEMO_USER_PASSWORD` y ejecuta `npm run db:seed`. El seed crea o
actualiza `agent@cybrdial.io` y asigna `TWILIO_PHONE_NUMBER` como su número
entrante. El seed no inicia sesión automáticamente ni ofrece una contraseña
por defecto. El usuario también puede crear una cuenta desde `/login`.

La aplicación estará disponible en `http://localhost:3000`. Configura ese
dominio público en `APP_URL` y como URL del webhook entrante de SMS
en Twilio: `POST /api/webhooks/sms/incoming`.
Para voz, configura el número entrante como `POST /api/webhooks/voice/incoming`
y la TwiML App como `POST /api/webhooks/voice/outbound`.

## Estructura principal

- `src/app/api/auth/`: registro, inicio/cierre de sesión y consulta de sesión.
- `src/app/api/contacts/`: CRUD de contactos, acotado al usuario autenticado.
- `src/app/api/messages/`: listado de conversaciones y envío de SMS.
- `src/app/api/webhooks/sms/incoming/`: recepción validada de SMS entrantes.
- `src/app/(dashboard)/`: interfaz de contactos y conversaciones SMS.
- `src/lib/auth.ts`: sesión JWT, cookies seguras y resolución del usuario.
- `src/lib/prisma.ts`: cliente Prisma singleton.
- `src/services/twilio.service.ts`: creación centralizada del cliente de Twilio.
- `prisma/schema.prisma`: modelos relacionales de usuarios, contactos,
  llamadas y mensajes.

## API

- `POST /api/auth/register` y `POST /api/auth/login` crean una sesión JWT.
- `GET /api/auth` consulta la sesión y `DELETE /api/auth` la cierra.
- `GET` y `POST /api/contacts` listan y crean contactos.
- `GET`, `PATCH` y `DELETE /api/contacts/:contactId` leen, actualizan y eliminan
  un contacto. Los teléfonos deben estar en formato E.164.
- `GET /api/messages?contactId=...` lista una conversación autenticada.
- `POST /api/messages/send` envía un SMS con Twilio.
- `POST /api/webhooks/sms/incoming` valida la firma de Twilio, asocia el SMS al
  usuario propietario del número destino y al contacto remitente, y persiste el
  mensaje de forma idempotente por `MessageSid`.
- `POST /api/token` emite un token de voz Twilio para el usuario autenticado.
- Los webhooks de voz requieren la firma Twilio; dirigen llamadas a una
  identidad WebRTC aislada por cuenta (`agent_cybr_01_<userId>`), guardan el
  registro inicial y actualizan el estado, duración y hora de finalización
  mediante `POST /api/webhooks/voice/status`.

Todos los endpoints protegidos resuelven `userId` desde la cookie de sesión;
ninguno confía en un identificador de usuario enviado por el cliente. La UI
actualiza conversaciones mediante polling cada cuatro segundos.

## Variables de entorno y despliegue

Consulta `.env.example`. `DATABASE_URL` debe apuntar a PostgreSQL y `AUTH_SECRET`
debe ser un secreto aleatorio privado. Configura TLS en producción para que la
cookie de sesión use el atributo `Secure`. Configura `TWILIO_AUTH_TOKEN`,
`TWILIO_PHONE_NUMBER`, `TWILIO_API_KEY_SID`, `TWILIO_API_KEY_SECRET` y
`TWILIO_TWIML_APP_SID` según las funciones habilitadas.

La política de llamadas usa `ALLOWED_CALL_PREFIXES` como una lista separada por
comas de prefijos E.164; si está ausente o vacía no se permite ningún destino.
`MAX_OUTBOUND_CALLS_PER_DAY` establece el límite diario por usuario y usa 30
cuando no está definido o no contiene un entero válido. `REGISTRATION_INVITE_CODE`
debe contener un código privado para habilitar el registro desde `/login`; si no
está definido, el registro permanece cerrado.

Para enrutar SMS entrantes en una instalación multiusuario, asigna un número
Twilio único a cada cuenta en `User.twilioPhoneNumber`; el seed demo asigna el
número global configurado. Añade limitación de intentos distribuida para
registro/inicio de sesión y supervisión de errores en el despliegue.

Antes de producción, configura autenticación de webhook con la URL pública
exacta de Twilio y revisa las reglas de retención/consentimiento de SMS.

## Validación

Ejecuta `npm run typecheck`, `npm run build` y `npm run db:generate` para
verificar tipos, compilación y cliente de base de datos. No publiques las
credenciales del archivo `.env`.

## Limitaciones conocidas

PostCSS anidado de Next 15 con avisos de severidad alta; solo se ejecuta al compilar sobre CSS propio; se resolverá al migrar a Next 16.
