export async function POST() {
  return Response.json(
    { error: "El webhook de SMS aún no está configurado." },
    { status: 501 },
  );
}
