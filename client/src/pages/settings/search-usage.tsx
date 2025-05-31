import { SearchUsageDashboard } from "@/components/search-usage-dashboard";
import { PageHeader } from "@/components/page-header";

export default function SearchUsagePage() {
  return (
    <div className="container py-8">
      <PageHeader
        heading="Search Usage"
        subheading="Monitor your external link search quota"
      />
      <div className="mt-8 max-w-2xl">
        <SearchUsageDashboard />
      </div>
    </div>
  );
}
