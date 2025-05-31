import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Search, Tag } from "lucide-react";
import KeywordResearch from "./keyword-research";
import WordGenerator from "./word-generator";

export default function CombinedKeywordResearch() {
  const [activeTab, setActiveTab] = useState("keyword-research");

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Keyword Research</h1>
          <p className="text-muted-foreground mt-1">
            Research keywords, generate related words, and discover SEO opportunities
          </p>
        </div>

        <Alert variant="default" className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertTitle>Keyword Research Tools</AlertTitle>
          <AlertDescription>
            Use the Keyword Research tab to find search volumes and competition metrics. 
            Use the Word Generator tab to create lists of related words, synonyms, and SEO variations.
          </AlertDescription>
        </Alert>

        <Tabs
          defaultValue="keyword-research"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="keyword-research" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span>Keyword Research</span>
            </TabsTrigger>
            <TabsTrigger value="word-generator" className="flex items-center gap-2">
              <Tag className="h-4 w-4" />
              <span>Word Generator</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="keyword-research" className="mt-0">
            {/* We're using the existing KeywordResearch component but hiding its header */}
            <div className="keyword-research-wrapper">
              <style jsx global>{`
                .keyword-research-wrapper h1,
                .keyword-research-wrapper > div > p,
                .keyword-research-wrapper > div > div.bg-muted\/50 {
                  display: none;
                }
              `}</style>
              <KeywordResearch />
            </div>
          </TabsContent>
          
          <TabsContent value="word-generator" className="mt-0">
            {/* We're using the existing WordGenerator component but hiding its header */}
            <div className="word-generator-wrapper">
              <style jsx global>{`
                .word-generator-wrapper h1,
                .word-generator-wrapper > div > p,
                .word-generator-wrapper > div > div.bg-muted\/50 {
                  display: none;
                }
              `}</style>
              <WordGenerator />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
