import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PenTool,
  Search,
  FileText,
  ListChecks,
  User,
  LogOut,
  BarChart2,
  Users,
  Files,
  Network,
  Settings2,
  Shield,
  // Tag, // No longer used after Word Generator removal
  // BookmarkIcon, // No longer used after Saved Words removal
  LineChart,
  Brain
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";

interface SidebarNavProps {
  className?: string;
}

export function SidebarNav({ className }: SidebarNavProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { user } = useUser();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Failed to logout');
      }

      return response.json();
    },
    onSuccess: () => {
      // Reload the page to reset all app state
      window.location.href = '/auth';
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const routes = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      tourId: "dashboard",
    },
    {
      href: "/dashboard/article-writer",
      label: "Article Writer",
      icon: PenTool,
      tourId: "article-writer",
    },
    {
      href: "/dashboard/bulk-article-writer",
      label: "Bulk Article Writer",
      icon: Files,
      tourId: "bulk-article-writer",
    },
    {
      href: "/dashboard/keyword-research",
      label: "Keyword Research",
      icon: Search,
      tourId: "keyword-research",
    },
    // Word Generator merged into Keyword Research
    // {
    //   href: "/dashboard/word-generator",
    //   label: "Word Generator",
    //   icon: Tag,
    //   tourId: "word-generator",
    // },
    {
      href: "/dashboard/my-articles",
      label: "My Articles",
      icon: FileText,
      tourId: "my-articles",
    },
    {
      href: "/dashboard/saved-lists",
      label: "Saved Keywords",
      icon: ListChecks,
      tourId: "saved-items",
    },
    // Saved Words merged into Saved Keywords
    // {
    //   href: "/dashboard/saved-words",
    //   label: "Saved Words",
    //   icon: BookmarkIcon,
    //   tourId: "saved-words",
    // },
    // SEO Audit removed
    // {
    //   href: "/dashboard/seo-audit",
    //   label: "SEO Audit",
    //   icon: BarChart2,
    //   tourId: "seo-audit",
    // },
    // AI Agent removed
    // {
    //   href: "/dashboard/agent",
    //   label: "AI SEO Agent",
    //   icon: Bot,
    //   tourId: "ai-agent",
    // },
    {
      href: "/dashboard/sitemap-analyzer",
      label: "Indexing",
      icon: Network,
      tourId: "sitemap-analyzer",
    },
    {
      href: "/dashboard/integrations",
      label: "Integrations",
      icon: Network,
      tourId: "integrations",
    },
    {
      href: "/dashboard/search-console",
      label: "Search Console",
      icon: LineChart,
      tourId: "search-console",
    },
  ];

  const adminRoutes = [
    {
      href: "/admin",
      label: "Admin Dashboard",
      icon: Shield,
    },
    {
      href: "/admin/users",
      label: "User Management",
      icon: Users,
    },
    {
      href: "/admin/analytics",
      label: "Analytics",
      icon: BarChart2,
    },
    {
      href: "/admin/settings",
      label: "System Settings",
      icon: Settings2,
    },
  ];

  return (
    <nav className={cn("space-y-1 w-full", className)}>
      <div className="space-y-1.5">
        {routes.map((route) => (
          <Link
            key={route.href}
            href={route.href}
            data-tour={route.tourId}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium w-full",
              "hover:bg-slate-100/80 hover:text-slate-900",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              location === route.href
                ? "bg-primary/5 text-primary shadow-sm"
                : "text-slate-600"
            )}
          >
            <route.icon className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{route.label}</span>
          </Link>
        ))}
      </div>

      {user?.isAdmin && (
        <>
          <div className="my-4 px-4">
            <div className="h-px bg-slate-200" />
          </div>
          <div className="space-y-1.5">
            {adminRoutes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium w-full",
                  "hover:bg-slate-100/80 hover:text-slate-900",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                  location === route.href
                    ? "bg-primary/5 text-primary shadow-sm"
                    : "text-slate-600"
                )}
              >
                <route.icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{route.label}</span>
              </Link>
            ))}
          </div>
        </>
      )}

      <div className="my-4 px-4">
        <div className="h-px bg-slate-200" />
      </div>

      <Link href="/dashboard/teams">
        <div
          data-tour="teams"
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium w-full",
            "hover:bg-slate-100/80 hover:text-slate-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            location === "/dashboard/teams"
              ? "bg-primary/5 text-primary shadow-sm"
              : "text-slate-600"
          )}
        >
          <Users className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Teams</span>
        </div>
      </Link>

      <Link href="/dashboard/profile">
        <div
          data-tour="profile"
          className={cn(
            "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium w-full",
            "hover:bg-slate-100/80 hover:text-slate-900",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            location === "/dashboard/profile"
              ? "bg-primary/5 text-primary shadow-sm"
              : "text-slate-600"
          )}
        >
          <User className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Profile Settings</span>
        </div>
      </Link>

      <button
        onClick={() => {
          if (!logoutMutation.isLoading) {
            logoutMutation.mutate();
          }
        }}
        disabled={logoutMutation.isLoading}
        className={cn(
          "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium w-full text-left",
          "hover:bg-red-50 hover:text-red-600",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2",
          "active:scale-[0.98]",
          "text-slate-600",
          logoutMutation.isLoading && "opacity-50 cursor-not-allowed"
        )}
      >
        {logoutMutation.isLoading ? (
          <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4 flex-shrink-0" />
        )}
        <span className="truncate">
          {logoutMutation.isLoading ? "Logging out..." : "Logout"}
        </span>
      </button>
    </nav>
  );
}