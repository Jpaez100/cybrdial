import { redirect } from "next/navigation";
import { requireAuthenticatedUser } from "@/lib/require-authenticated-user";

export default async function HomePage() {
  await requireAuthenticatedUser();
  redirect("/dashboard");
}
