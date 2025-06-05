import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";
import Dashboard from "@/pages/dashboard";
import Home from "@/pages/home";
import Home2 from "@/pages/home2";
import Home3 from "@/pages/home3";
import Profile from "@/pages/profile";
import Auth from "@/pages/auth";
import Landing from "@/pages/landing";
import AdminLayout from "@/components/admin-layout";
import AdminDashboard from "@/pages/admin/dashboard";
import { useUser } from "@/hooks/use-user";
import { Loader2 } from "lucide-react";
import ArticleWriter from "@/pages/article-writer";
import BulkArticleWriter from "@/pages/bulk-article-writer";
// KeywordResearch is now used via the combined component
// import KeywordResearch from "@/pages/keyword-research";
import CombinedKeywordResearch from "@/pages/combined-keyword-research";
import MyArticles from "@/pages/my-articles";
// SavedLists is now used via the combined component
// import SavedLists from "@/pages/saved-lists";
// import SeoAudit from "@/pages/seo-audit"; // SEO Audit removed
// import Agent from "@/pages/agent"; // AI Agent removed
import SitemapAnalyzer from "@/pages/sitemap-analyzer";
// WordGenerator is now used via the combined component
// import WordGenerator from "@/pages/word-generator";
import Integrations from "@/pages/integrations";
import Teams from "@/pages/teams";
import TeamInvitePage from "@/pages/team-invite";
import CreateTeamPage from "@/pages/create-team";
import TeamDetails from "@/pages/team-details";
import TeamBillingPage from "@/pages/team-billing";
import TeamRolesPage from "@/pages/team-roles";
import { PostHogTest } from "@/components/PostHogTest";
import Pricing from "@/pages/pricing";
import UsersPage from "@/pages/admin/users";
import AnalyticsPage from "@/pages/admin/analytics";
import SettingsPage from "@/pages/admin/settings";
// SavedWords is now used via the combined component
// import SavedWords from "@/pages/saved-words";
import CombinedSavedKeywords from "@/pages/combined-saved-keywords";
import SearchConsole from "@/pages/dashboard/search-console";
import { AISEOPage } from "@/pages/AISEOPage";
import { LLMBrandRankingPage } from "@/pages/LLMBrandRankingPage";
import { trpc, trpcClient } from "./utils/trpc";
import { TeamProvider } from "@/hooks/use-team-context";

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  if (!user.isAdmin) {
    window.location.href = "/";
    return null;
  }

  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/auth";
    return null;
  }

  return <>{children}</>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <TeamProvider>
          <Switch>
            {/* Public routes */}
            <Route path="/" component={() => (
              <>
                <Landing />
                <PostHogTest />
              </>
            )} />
            <Route path="/home" component={Home} />
            <Route path="/home2" component={Home2} />
            <Route path="/home3" component={Home3} />
            <Route path="/auth" component={Auth} />
            <Route path="/pricing" component={Pricing} />

            {/* Protected dashboard routes */}
            <Route path="/dashboard" component={() => (
              <RequireAuth>
                <Layout>
                  <Dashboard />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/profile" component={() => (
              <RequireAuth>
                <Layout>
                  <Profile />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/profile-settings" component={() => (
              <RequireAuth>
                <Layout>
                  <Profile />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/teams" component={() => (
              <RequireAuth>
                <Layout>
                  <Teams />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/teams/invite" component={() => (
              <RequireAuth>
                <Layout>
                  <TeamInvitePage />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/teams/create" component={() => (
              <RequireAuth>
                <Layout>
                  <CreateTeamPage />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/teams/:id" component={() => (
              <RequireAuth>
                <Layout>
                  <TeamDetails />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/teams/:teamId/billing" component={() => (
              <RequireAuth>
                <Layout>
                  <TeamBillingPage />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/teams/:teamId/roles" component={() => (
              <RequireAuth>
                <Layout>
                  <TeamRolesPage />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/article-writer" component={() => (
              <RequireAuth>
                <Layout>
                  <ArticleWriter />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/bulk-article-writer" component={() => (
              <RequireAuth>
                <Layout>
                  <BulkArticleWriter />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/keyword-research" component={() => (
              <RequireAuth>
                <Layout>
                  <CombinedKeywordResearch />
                </Layout>
              </RequireAuth>
            )} />
            {/* Redirect from old Word Generator path to new combined Keyword Research */}
            <Route path="/dashboard/word-generator" component={() => {
              window.location.href = "/dashboard/keyword-research";
              return null;
            }} />
            <Route path="/dashboard/my-articles" component={() => (
              <RequireAuth>
                <Layout>
                  <MyArticles />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/my-articles/:id" component={() => (
              <RequireAuth>
                <Layout>
                  <MyArticles />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/saved-lists" component={() => (
              <RequireAuth>
                <Layout>
                  <CombinedSavedKeywords />
                </Layout>
              </RequireAuth>
            )} />
            {/* SEO Audit route removed */}
            {/* <Route path="/dashboard/seo-audit" component={() => (
              <RequireAuth>
                <Layout>
                  <SeoAudit />
                </Layout>
              </RequireAuth>
            )} /> */}
            {/* AI SEO Agent route */}
            <Route path="/dashboard/ai-seo" component={() => (
              <RequireAuth>
                <Layout>
                  <AISEOPage />
                </Layout>
              </RequireAuth>
            )} />
            {/* LLM Brand Ranking route */}
            <Route path="/dashboard/llm-brand-ranking" component={() => (
              <RequireAuth>
                <Layout>
                  <LLMBrandRankingPage />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/sitemap-analyzer" component={() => (
              <RequireAuth>
                <Layout>
                  <SitemapAnalyzer />
                </Layout>
              </RequireAuth>
            )} />
            <Route path="/dashboard/integrations" component={() => (
              <RequireAuth>
                <Layout>
                  <Integrations />
                </Layout>
              </RequireAuth>
            )} />
            {/* Redirect from old Saved Words path to new combined Saved Keywords */}
            <Route path="/dashboard/saved-words" component={() => {
              window.location.href = "/dashboard/saved-lists";
              return null;
            }} />
            <Route path="/dashboard/search-console" component={() => (
              <RequireAuth>
                <Layout>
                  <SearchConsole />
                </Layout>
              </RequireAuth>
            )} />

            {/* Protected admin routes */}
            <Route path="/admin" component={() => (
              <RequireAuth>
                <RequireAdmin>
                  <AdminLayout>
                    <AdminDashboard />
                  </AdminLayout>
                </RequireAdmin>
              </RequireAuth>
            )} />
            <Route path="/admin/users" component={() => (
              <RequireAuth>
                <RequireAdmin>
                  <AdminLayout>
                    <UsersPage />
                  </AdminLayout>
                </RequireAdmin>
              </RequireAuth>
            )} />
            <Route path="/admin/analytics" component={() => (
              <RequireAuth>
                <RequireAdmin>
                  <AdminLayout>
                    <AnalyticsPage />
                  </AdminLayout>
                </RequireAdmin>
              </RequireAuth>
            )} />
            <Route path="/admin/settings" component={() => (
              <RequireAuth>
                <RequireAdmin>
                  <AdminLayout>
                    <SettingsPage />
                  </AdminLayout>
                </RequireAdmin>
              </RequireAuth>
            )} />

            {/* Catch all not found */}
            <Route component={NotFound} />
          </Switch>
          <Toaster />
        </TeamProvider>
      </trpc.Provider>
    </QueryClientProvider>
  );
}

export default App;