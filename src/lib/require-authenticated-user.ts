import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  getAuthenticatedUserFromToken,
  SESSION_COOKIE_NAME,
} from "@/lib/auth";

export async function requireAuthenticatedUser() {
  const cookieStore = await cookies();
  const user = await getAuthenticatedUserFromToken(
    cookieStore.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) {
    redirect("/login");
  }

  return user;
}
