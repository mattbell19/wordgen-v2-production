import { SitemapManager } from "@/components/sitemap-manager";
import { PageHeader } from "@/components/page-header";

export default function SitemapPage() {
  return (
    <div className="container py-8">
      <PageHeader
        heading="Sitemap Management"
        subheading="Manage your website's sitemap for internal linking"
      />
      <div className="mt-8">
        <SitemapManager />
      </div>
    </div>
  );
}
