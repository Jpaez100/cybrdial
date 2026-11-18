export async function POST() {
  return Response.json(
    { error: "La emisión de tokens de voz aún no está configurada." },
    { status: 501 },
  );
}
