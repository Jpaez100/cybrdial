# CybrDial

Aplicación de comunicaciones basada en Next.js App Router, TypeScript, Tailwind
CSS, Prisma y Twilio. Incluye autenticación JWT con cookies HTTP-only, gestión
de contactos, envío y recepción de SMS, y el inicio de un panel de control.

## Requisitos

- Node.js 20 o posterior
- PostgreSQL
- Una cuenta de Twilio para habilitar llamadas y SMS

## Arquitectura técnica

- Next.js App Router y React con componentes de servidor y cliente, Tailwind CSS
  y TypeScript estricto.
- Prisma ORM sobre PostgreSQL/Supabase. `DATABASE_URL` usa el Transaction Pooler
  de Supabase en el puerto `6543`; `DIRECT_URL` usa el Session Pooler en el puerto
  `5432` para operaciones de esquema.
- Modelo relacional para `User`, `Contact`, `CallLog` y `Message`, con relaciones
  acotadas por `userId`, índices y claves únicas para números, SIDs y consultas
  frecuentes.
- `@twilio/voice-sdk` registra el dispositivo WebRTC y establece llamadas
  mediante una TwiML App; Twilio SDK Node administra tokens, SMS y validación.
- Los webhooks SMS y Voice validan firma, método URL-encoded, `AccountSid`,
  ruta pública y parámetros antes de crear o actualizar registros.

## Configuración local

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env`.
3. Configura `DATABASE_URL` con el Transaction Pooler de Supabase por el puerto
   `6543`, `DIRECT_URL` con el Session Pooler por el puerto `5432`, y una
   `AUTH_SECRET` aleatoria de al menos 32 bytes.
4. Completa las credenciales de Twilio: Account SID, Auth Token, API Key SID,
   API Key Secret, TwiML App SID y el número de voz.
5. Genera Prisma y sincroniza el esquema:

```bash
npm run db:generate
npx prisma db push
npx prisma db seed
```

El seed crea o actualiza el usuario demo `agent@cybrdial.io`. Para ejecutarlo,
define un valor seguro de 12 a 72 bytes en `DEMO_USER_PASSWORD`; no se usa una
contraseña real ni una predeterminada en el repositorio. El usuario puede iniciar
sesión con ese correo y la contraseña configurada localmente.

Puedes iniciar el entorno de desarrollo con `npm run dev`.

La aplicación estará disponible en `http://localhost:3000`. Configura ese
dominio público en `APP_URL` y como URL del webhook entrante de SMS
en Twilio: `POST /api/webhooks/sms/incoming`.
Para voz, configura el número entrante como `POST /api/webhooks/voice/incoming`
y la TwiML App como `POST /api/webhooks/voice/outbound`.

Para pruebas públicas, ejecuta `cloudflared tunnel --url http://localhost:3000`
(o inicia el túnel con el nombre configurado en tu cuenta) y establece
`APP_URL="https://<YOUR-PUBLIC-HTTPS-HOST>"` antes de iniciar Next.js.
Usa la misma URL HTTPS sin barra final como base de los callbacks de Twilio.
`NEXT_PUBLIC_APP_URL` sigue aceptándose temporalmente como respaldo, pero
muestra una advertencia y debe sustituirse por `APP_URL`.

## Estructura principal

- `src/app/api/auth/`: registro, inicio/cierre de sesión y consulta de sesión.
- `src/app/api/contacts/`: CRUD de contactos, acotado al usuario autenticado.
- `src/app/api/messages/`: listado de conversaciones y envío de SMS.
- `src/app/api/webhooks/sms/incoming/`: recepción validada de SMS entrantes.
- `src/app/(app)/`: único layout protegido y páginas de dashboard, llamadas,
  contactos y mensajes.
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
`APP_URL` es la URL pública HTTPS usada por los webhooks y callbacks de Twilio.
`ALLOWED_CALL_PREFIXES`, `MAX_OUTBOUND_CALLS_PER_DAY` y
`REGISTRATION_INVITE_CODE` son variables obligatorias para las políticas descritas;
no las publiques ni las agregues a variables expuestas al navegador.

Para enrutar SMS entrantes en una instalación multiusuario, asigna un número
Twilio único a cada cuenta en `User.twilioPhoneNumber`; el seed demo asigna el
número global configurado. Añade limitación de intentos distribuida para
registro/inicio de sesión y supervisión de errores en el despliegue.

Antes de producción, configura autenticación de webhook con la URL pública
exacta de Twilio y revisa las reglas de retención/consentimiento de SMS.

## Validación

Ejecuta las comprobaciones completas antes de entregar:

```bash
npx prisma validate
npx tsc --noEmit
npm run build
npm start
```

Para probar el servidor ya compilado usa `npm run build && npm run start`.
`npm run start` sirve la aplicación en el puerto configurado por Next.js,
habitualmente `http://localhost:3000`.

En pruebas con una cuenta **Twilio Trial**, las llamadas salientes a números
no verificados pueden mostrar una solicitud de upgrade y ser rechazadas por
Twilio. Los SMS libres pueden devolver el código `572006`, relacionado con la
restricción de plantillas predefinidas aplicable al entorno Trial. CybrDial
marca el mensaje como `failed`, registra la respuesta y muestra el resultado
controlado en la API; no vuelve a intentar ni expone credenciales.

## Limitaciones conocidas

- La limitación de tasa está implementada en memoria; solo funciona de forma
  efectiva con una instancia y debe reemplazarse por Redis/Upstash en despliegues
  multiinstancia.
- El esquema se aplica con `db push` y todavía no existe una estrategia formal
  de migraciones versionadas.
- `bcryptjs` se ejecuta como implementación JavaScript pura.
- Next 15 se mantiene en el proyecto y está considerado en mantenimiento;
  futuras actualizaciones mayores requieren una migración planificada.
- PostCSS anidado de Next 15 conserva avisos de severidad alta en auditorías;
  se resolverá al migrar a una versión de Next que sustituya esa dependencia.
