"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Moon, Sun, Sparkles, User, LogOut, ScanSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/layout/theme-provider";
import { useAuth } from "@/components/auth/auth-provider";
import { useToast } from "@/components/ui/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const links = [
  { href: "/review", label: "Review" },
  { href: "/plagiarism", label: "Plagiarism Checker" },
  { href: "/history", label: "History" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { user, isLoading, logout } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    await logout();
    toast({ title: "Signed out", variant: "success" });
    router.push("/");
    router.refresh();
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "";

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-14 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline">CodeSage AI</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
                pathname?.startsWith(link.href) && "text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {isLoading ? null : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[10px] font-semibold text-primary">
                    {initials}
                  </span>
                  <span className="hidden max-w-[10ch] truncate sm:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="h-3.5 w-3.5" /> Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/plagiarism">
                    <ScanSearch className="h-3.5 w-3.5" /> Plagiarism Checker
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="h-3.5 w-3.5" /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Log in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/signup">Sign up</Link>
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-4 py-1.5 sm:hidden">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground",
              pathname?.startsWith(link.href) && "bg-secondary text-foreground"
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
