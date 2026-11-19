import { createSessionCookie, getAuthenticatedUser } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const user = await getAuthenticatedUser(request);
    return Response.json({ user });
  } catch (error) {
    console.error("Authentication session lookup failed:", error);
    return Response.json(
      { error: "No se pudo consultar la sesión." },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  return Response.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": createSessionCookie("", 0),
      },
    },
  );
}
