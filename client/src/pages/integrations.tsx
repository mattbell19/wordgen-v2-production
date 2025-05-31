
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WebflowDialog } from "@/components/webflow-dialog";
import { useState } from "react";

export default function Integrations() {
  const [webflowOpen, setWebflowOpen] = useState(false);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">CMS Integrations</h1>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setWebflowOpen(true)}>
          <CardHeader>
            <CardTitle>Webflow</CardTitle>
            <CardDescription>Connect your Webflow CMS to publish articles directly</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Publish and manage content on your Webflow site</p>
          </CardContent>
        </Card>
      </div>

      <WebflowDialog open={webflowOpen} onOpenChange={setWebflowOpen} />
    </div>
  );
}
