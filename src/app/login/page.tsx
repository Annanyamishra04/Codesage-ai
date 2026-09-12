import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/profile");

  return (
    <div className="container flex min-h-[calc(100vh-3.5rem)] max-w-md flex-col justify-center py-10">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
