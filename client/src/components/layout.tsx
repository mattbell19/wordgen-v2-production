import { SidebarNav } from "./sidebar-nav";
import { fadeInVariants, scaleVariants } from "@/lib/animation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { Link } from "wouter";
import wordgenLogo from "@/assets/wordgen-logo.png";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/80">
      <div className="flex">
        <aside className={cn(
          "hidden lg:block h-screen w-72 flex-none fixed border-r border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm",
          "will-change-transform"
        )}>
          <div className={cn(
            "flex h-16 items-center border-b border-slate-200/80 bg-white/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-white/60",
            "will-change-transform"
          )}>
            <Link href="/" className="flex items-center space-x-2">
              <img
                src={wordgenLogo}
                alt="Wordgen Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>
          <div className="flex-1 overflow-auto py-6 px-4">
            <SidebarNav />
          </div>
        </aside>
        <main className="flex-1 lg:pl-72 w-full">
          <div className="container max-w-7xl mx-auto px-6 py-8 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}