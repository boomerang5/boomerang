"use client";

import { useTransition } from "react";
import Link from "next/link";
import { signOutAction } from "@/app/actions";
import { Settings, LogOut, User, HelpCircle } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export default function SettingsMenu() {
  const [isPending, startTransition] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Abrir configuración"
          className="p-2 rounded-full hover:bg-white/10 transition"
        >
          <Settings className="h-5 w-5" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-56">
        <DropdownMenuLabel>Configuración</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() =>
            startTransition(async () => {
              await signOutAction();            // tu server action hace redirect a /sign-in
            })
          }
          disabled={isPending}
          className="text-red-500 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {isPending ? "Cerrando…" : "Cerrar sesión"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}