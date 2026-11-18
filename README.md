# Cybrdial

Base de una aplicación de comunicaciones con Next.js App Router, Prisma y
Twilio. El proyecto incluye las rutas y pantallas iniciales para autenticación,
tokens de voz, webhooks y el panel de control; esas integraciones aún deben
implementarse antes de usar la aplicación con tráfico real.

## Requisitos

- Node.js 20 o posterior
- PostgreSQL
- Una cuenta de Twilio para habilitar llamadas y SMS

## Configuración local

1. Instala las dependencias con `npm install`.
2. Copia `.env.example` a `.env` y completa las credenciales de PostgreSQL y
   Twilio.
3. Genera el cliente de Prisma con `npm run db:generate`.
4. Aplica el esquema a la base de datos configurada con `npm run db:push`.
5. Inicia el servidor de desarrollo con `npm run dev`.

La aplicación estará disponible en `http://localhost:3000`. Para compilar y
comprobar tipos, ejecuta `npm run build` y `npm run typecheck`.

## Estructura principal

- `src/app/api/`: rutas para autenticación, tokens de voz y webhooks.
- `src/app/dashboard/`: pantallas del panel, llamadas, mensajes y contactos.
- `src/services/twilio.service.ts`: creación centralizada del cliente de Twilio.
- `prisma/schema.prisma`: modelos relacionales de usuarios, contactos,
  llamadas y mensajes.

## Variables de entorno

Consulta `.env.example`. `DATABASE_URL` debe apuntar a PostgreSQL. Las variables
de Twilio se usan para la integración con la cuenta; `NEXT_PUBLIC_APP_URL` es
la URL pública que se debe configurar como destino de los webhooks.

## Estado de las integraciones

Las rutas de API incluidas devuelven HTTP 501 de forma intencional: son puntos
de extensión y no procesan autenticación, llamadas, tokens ni mensajes todavía.
Antes de exponerlas, implementa autenticación/autorización y validación de la
firma de cada webhook de Twilio. No publiques credenciales del archivo `.env`.
