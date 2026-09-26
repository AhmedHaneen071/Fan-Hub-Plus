"use client";

import { useRouter } from "next/navigation";
import { logoutUser } from "@/lib/auth-actions";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";

type UserMenuProps = {
  name: string;
  email: string;
  avatarUrl: string | null;
  role?: string | null;
};

export function UserMenu({ name, email, avatarUrl, role }: UserMenuProps) {
  const router = useRouter();

  // First letters of the name, e.g. "Mia Fan" -> "MF". Used while a profile
  // picture is missing.
  const initials = name
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function handleSignOut() {
    await logoutUser();
    router.push("/");
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 gap-2 rounded-full px-2"
          aria-label={`Account menu for ${name}`}
        >
          <Avatar className="size-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="hidden text-sm font-medium sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs font-normal text-muted-foreground">{email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => router.push("/dashboard")}>
          <LayoutDashboard aria-hidden="true" />
          Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => router.push("/profile")}>
          <UserRound aria-hidden="true" />
          Profile
        </DropdownMenuItem>
        {role === "ADMIN" ? (
          <DropdownMenuItem onSelect={() => router.push("/admin")}>
            <ShieldCheck aria-hidden="true" />
            Admin panel
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <LogOut aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}