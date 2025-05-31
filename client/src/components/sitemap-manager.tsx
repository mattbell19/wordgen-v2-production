import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Globe } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SitemapManager() {
  const [sitemapUrl, setSitemapUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [links, setLinks] = useState<Array<{ url: string; topic: string; relevance: number }>>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch links on component mount
  useEffect(() => {
    fetchLinks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sitemapUrl) {
      setError("Please enter a sitemap URL");
      return;
    }

    try {
      setIsSubmitting(true);

      const response = await fetch('/api/sitemap/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sitemapUrl }),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to process sitemap');
      }

      const data = await response.json();

      toast({
        title: "Success",
        description: `Processed sitemap with ${data.data.linksFound} links found`,
      });

      // Fetch the links
      await fetchLinks();

      // Clear the input
      setSitemapUrl("");

    } catch (error: any) {
      setError(error.message || 'An error occurred while processing the sitemap');
      toast({
        title: "Error",
        description: error.message || "Failed to process sitemap",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchLinks = async () => {
    try {
      const response = await fetch('/api/sitemap/links', {
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch links');
      }

      const data = await response.json();
      setLinks(data.data.links);

    } catch (error: any) {
      console.error('Error fetching links:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sitemap Manager</CardTitle>
        <CardDescription>
          Add your website's sitemap URL to enable internal linking in your articles.
          {links.length === 0 && (
            <span className="block mt-2 text-amber-600 font-medium">
              You need to add a sitemap before internal linking will work.
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center space-x-2">
            <div className="grid flex-1 gap-2">
              <Input
                type="url"
                placeholder="https://example.com/sitemap.xml"
                value={sitemapUrl}
                onChange={(e) => setSitemapUrl(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Add Sitemap"
              )}
            </Button>
          </div>
        </form>

        {links.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2">Available Internal Links ({links.length})</h3>
            <div className="border rounded-md overflow-hidden">
              <div className="max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Topic</th>
                      <th className="px-4 py-2 text-left">URL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {links.map((link, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-4 py-2">{link.topic}</td>
                        <td className="px-4 py-2 truncate max-w-xs">
                          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline flex items-center">
                            <Globe className="h-3 w-3 mr-1" />
                            {link.url}
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        Internal links will be automatically included in your articles when internal linking is enabled.
      </CardFooter>
    </Card>
  );
}
