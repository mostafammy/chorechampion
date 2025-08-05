"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle() {
  const { setTheme, theme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-48 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-50"
      >
        <DropdownMenuItem 
          onClick={() => setTheme("light")}
          className={cn(
            "hover:bg-slate-100 dark:hover:bg-slate-600 focus:bg-slate-100 dark:focus:bg-slate-600",
            "hover:text-slate-900 dark:hover:text-white focus:text-slate-900 dark:focus:text-white",
            theme === "light" ? "bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-100" : ""
          )}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("dark")}
          className={cn(
            "hover:bg-slate-100 dark:hover:bg-slate-600 focus:bg-slate-100 dark:focus:bg-slate-600",
            "hover:text-slate-900 dark:hover:text-white focus:text-slate-900 dark:focus:text-white",
            theme === "dark" ? "bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-100" : ""
          )}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => setTheme("system")}
          className={cn(
            "hover:bg-slate-100 dark:hover:bg-slate-600 focus:bg-slate-100 dark:focus:bg-slate-600",
            "hover:text-slate-900 dark:hover:text-white focus:text-slate-900 dark:focus:text-white",
            theme === "system" ? "bg-blue-50 text-blue-900 dark:bg-blue-900 dark:text-blue-100" : ""
          )}
        >
          <div className="mr-2 h-4 w-4 rounded-sm border border-gray-300 dark:border-gray-600 bg-gradient-to-br from-gray-100 to-gray-300 dark:from-gray-600 dark:to-gray-800" />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
