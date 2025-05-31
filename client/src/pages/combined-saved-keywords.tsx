import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, ListChecks, BookmarkIcon } from "lucide-react";
import SavedLists from "./saved-lists";
import SavedWords from "./saved-words";

export default function CombinedSavedKeywords() {
  const [activeTab, setActiveTab] = useState("saved-keywords");

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Saved Keywords</h1>
          <p className="text-muted-foreground mt-1">
            Manage your saved keywords and word lists
          </p>
        </div>

        <Alert variant="default" className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertTitle>Saved Keywords</AlertTitle>
          <AlertDescription>
            Use the Saved Keywords tab to manage your keyword research results. 
            Use the Saved Words tab to manage your generated word lists.
          </AlertDescription>
        </Alert>

        <Tabs
          defaultValue="saved-keywords"
          value={activeTab}
          onValueChange={setActiveTab}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="saved-keywords" className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              <span>Saved Keywords</span>
            </TabsTrigger>
            <TabsTrigger value="saved-words" className="flex items-center gap-2">
              <BookmarkIcon className="h-4 w-4" />
              <span>Saved Words</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="saved-keywords" className="mt-0">
            {/* We're using the existing SavedLists component but hiding its header */}
            <div className="saved-lists-wrapper">
              <style jsx global>{`
                .saved-lists-wrapper h1,
                .saved-lists-wrapper > div > p {
                  display: none;
                }
              `}</style>
              <SavedLists />
            </div>
          </TabsContent>
          
          <TabsContent value="saved-words" className="mt-0">
            {/* We're using the existing SavedWords component but hiding its header */}
            <div className="saved-words-wrapper">
              <style jsx global>{`
                .saved-words-wrapper h1,
                .saved-words-wrapper > div > p {
                  display: none;
                }
              `}</style>
              <SavedWords />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
