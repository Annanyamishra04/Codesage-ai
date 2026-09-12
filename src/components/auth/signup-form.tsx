"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, Circle, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import { registerAccount } from "@/lib/api-client";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

export function SignupForm() {
  const router = useRouter();
  const { refresh } = useAuth();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordLongEnough = password.length >= MIN_PASSWORD_LENGTH;

  const canSubmit = useMemo(
    () => name.trim().length > 0 && /\S+@\S+\.\S+/.test(email) && passwordLongEnough,
    [name, email, passwordLongEnough]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const user = await registerAccount(name.trim(), email.trim(), password);
      refresh(user);
      toast({ title: `Welcome to CodeSage AI, ${user.name.split(" ")[0]}!`, variant: "success" });
      router.push("/review");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>Free, no credit card required — get your own review &amp; plagiarism history.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              autoComplete="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ada Lovelace"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isSubmitting}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              disabled={isSubmitting}
            />
            <p
              className={cn(
                "flex items-center gap-1.5 text-xs",
                passwordLongEnough ? "text-success" : "text-muted-foreground"
              )}
            >
              {passwordLongEnough ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
              At least {MIN_PASSWORD_LENGTH} characters
            </p>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting || !canSubmit}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" /> Create account
              </>
            )}
          </Button>
        </form>

        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
