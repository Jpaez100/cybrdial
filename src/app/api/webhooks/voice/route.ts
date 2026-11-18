export async function POST() {
  return Response.json(
    { error: "El webhook de voz aún no está configurado." },
    { status: 501 },
  );
}
