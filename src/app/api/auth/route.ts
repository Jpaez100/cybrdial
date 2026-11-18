export async function GET() {
  return Response.json(
    { error: "La autenticación aún no está configurada." },
    { status: 501 },
  );
}
