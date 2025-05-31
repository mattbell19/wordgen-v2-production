import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface WebflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  articleData: any;
}

export function WebflowDialog({ open, onOpenChange, articleData }: WebflowDialogProps) {
  const [apiKey, setApiKey] = useState("");
  const [selectedSite, setSelectedSite] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [sites, setSites] = useState([]);
  const [collections, setCollections] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const isValidApiKey = apiKey.startsWith('site_');

  const connectWebflow = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/webflow/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to connect to Webflow");
      }

      const { sites } = await response.json();
      setSites(sites);
      toast({ title: "Successfully connected to Webflow" });
    } catch (error: any) {
      toast({
        title: error.message || "Error connecting to Webflow",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const verifySiteAccess = async (siteId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/webflow/verify/${siteId}`, {
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Unable to access this site");

      setSelectedSite(siteId);
      toast({ title: "Site access verified" });
      fetchCollections(siteId);
    } catch (error) {
      toast({
        title: "Error verifying site access",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollections = async (siteId: string) => {
    try {
      const response = await fetch(`/api/webflow/collections/${apiKey}/${siteId}`);
      if (!response.ok) throw new Error("Failed to fetch collections");
      const data = await response.json();
      setCollections(data);
    } catch (error) {
      toast({
        title: "Error fetching collections",
        variant: "destructive",
      });
    }
  };

  const publishToWebflow = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/webflow/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey,
          collectionId: selectedCollection,
          articleData,
        }),
      });

      if (!response.ok) throw new Error("Failed to publish to Webflow");

      toast({ title: "Published to Webflow successfully" });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error publishing to Webflow",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect to Webflow CMS</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <Alert variant={isValidApiKey ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please use a site-specific API key from your Webflow site settings:
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>Go to your Webflow site's Settings</li>
                <li>Navigate to Integrations tab</li>
                <li>Click "Generate API Token"</li>
                <li>Enable both read and write permissions</li>
                <li>The key should start with "site_"</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Input
              placeholder="Enter site-specific API key (starts with 'site_')"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className={!isValidApiKey && apiKey ? "border-red-500" : ""}
            />
            {apiKey && !isValidApiKey && (
              <p className="text-sm text-red-500">
                Invalid API key format. The key should start with "site_"
              </p>
            )}
            <Button
              onClick={connectWebflow}
              disabled={!isValidApiKey || isLoading}
              size="sm"
            >
              {isLoading ? "Connecting..." : "Connect"}
            </Button>
          </div>

          {sites.length > 0 && (
            <Select
              value={selectedSite}
              onValueChange={(value) => {
                setSelectedSite(value);
                fetchCollections(value);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a site" />
              </SelectTrigger>
              <SelectContent>
                {sites.map((site: any) => (
                  <SelectItem key={site.id} value={site.id}>
                    {site.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {collections.length > 0 && (
            <Select
              value={selectedCollection}
              onValueChange={setSelectedCollection}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a collection" />
              </SelectTrigger>
              <SelectContent>
                {collections.map((collection: any) => (
                  <SelectItem key={collection.id} value={collection.id}>
                    {collection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            onClick={publishToWebflow}
            disabled={!selectedCollection || isLoading}
            className="w-full"
          >
            {isLoading ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}