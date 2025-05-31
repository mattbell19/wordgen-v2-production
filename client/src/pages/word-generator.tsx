import { useState } from "react";
import { Loader2, Search, Copy, Info, Tag, Download, BookmarkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useUser } from "@/hooks/use-user";
import { SaveWordsDialog } from "@/components/save-words-dialog";

interface WordResponse {
  keyword: string;
  words: string[];
  categories?: Record<string, string[]>;
}

// Function to get API URL
function getApiUrl(endpoint: string): string {
  // In development, use the proxy configured in vite.config.ts
  return endpoint;
}

export default function WordGenerator() {
  const { toast } = useToast();
  const { user } = useUser();
  const [keyword, setKeyword] = useState("");
  const [wordCount, setWordCount] = useState(50);
  const [wordType, setWordType] = useState<"all" | "synonyms" | "related" | "seo">("all");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<WordResponse | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);

  // Generate words function
  async function generateWords() {
    if (!keyword.trim()) {
      toast({
        title: "Keyword Required",
        description: "Please enter a keyword to generate related words.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Authentication Required",
        description: "Please log in to use the word generator.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Add a small delay to ensure credentials are loaded
      await new Promise(resolve => setTimeout(resolve, 500));

      const response = await fetch('/api/ai/words/generate', {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify({
          keyword: keyword.trim(),
          count: wordCount,
          type: wordType
        }),
        credentials: 'include',
      });

      if (!response.ok) {
        let errorMessage = "Failed to generate words";
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch (e) {
          // If we can't parse the error JSON, just use the default message
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || data.error || "Failed to generate words");
      }

      setResult(data.data);
      toast({
        title: "Word Generation Complete",
        description: `Generated ${data.data.words.length} words for "${keyword}"`,
      });
    } catch (error) {
      console.error("Word generation error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate words",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle copy to clipboard
  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(
      () => {
        toast({
          title: "Copied to Clipboard",
          description: "The words have been copied to your clipboard.",
        });
      },
      () => {
        toast({
          title: "Copy Failed",
          description: "Failed to copy to clipboard. Please try again.",
          variant: "destructive",
        });
      }
    );
  }

  // Download words as a CSV file
  function downloadAsCsv() {
    if (!result) return;

    let csvContent = "Word,Type\n";

    if (result.categories) {
      // If we have categories, include them in the CSV
      Object.entries(result.categories).forEach(([category, words]) => {
        words.forEach(word => {
          csvContent += `"${word.replace(/"/g, '""')}","${category.replace(/"/g, '""')}"\n`;
        });
      });
    } else {
      // Otherwise just list the words
      result.words.forEach(word => {
        csvContent += `"${word.replace(/"/g, '""')}","${wordType}"\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${keyword.replace(/\s+/g, '-')}-words.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Render words by category
  function renderCategories() {
    if (!result?.categories) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(result.categories).map(([category, words]) => (
          <Card key={category} className="shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
              <CardDescription>{words.length} words</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {words.map((word, i) => (
                  <Badge key={i} variant="secondary" className="text-sm py-1 cursor-pointer hover:bg-muted"
                    onClick={() => copyToClipboard(word)}>
                    {word}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Render all words as a simple list (for types other than 'all')
  function renderWordList() {
    if (!result?.words) return null;

    return (
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Related Words for "{result.keyword}"</CardTitle>
          <CardDescription>{result.words.length} words generated</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {result.words.map((word, i) => (
              <Badge key={i} variant="secondary" className="text-sm py-1 cursor-pointer hover:bg-muted"
                onClick={() => copyToClipboard(word)}>
                {word}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" size="sm" onClick={() => copyToClipboard(result.words.join('\n'))}>
            <Copy className="mr-2 h-4 w-4" />
            Copy All
          </Button>
        </CardFooter>
      </Card>
    );
  }

  // Get all words from the result (either from categories or flat list)
  function getAllWords(): string[] {
    if (!result) return [];

    // If result has categories, flatten them
    if (result.categories) {
      return Object.values(result.categories).flat();
    }

    // Otherwise, return the flat list
    return result.words;
  }

  return (
    <div className="container py-8 max-w-7xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Word Generator</h1>
          <p className="text-muted-foreground mt-1">
            Generate related words, synonyms, and SEO keywords from a seed word
          </p>
        </div>

        <Alert variant="default" className="bg-muted/50">
          <Info className="h-4 w-4" />
          <AlertTitle>Word Generation Tips</AlertTitle>
          <AlertDescription>
            Enter a keyword to generate related words. Choose the type of words you want to generate (all, synonyms, related concepts, or SEO keywords).
            Adjust the count to control how many words are generated. Click on any word to copy it to your clipboard.
          </AlertDescription>
        </Alert>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Generate Words</CardTitle>
            <CardDescription>
              Enter a keyword and customize generation options
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="keyword">Keyword</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="keyword"
                    placeholder="Enter a keyword (e.g., marketing)"
                    className="pl-10"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Word Type</Label>
                <Select
                  defaultValue="all"
                  onValueChange={(value) => setWordType(value as any)}
                  disabled={isLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select word type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All (Categorized)</SelectItem>
                    <SelectItem value="synonyms">Synonyms</SelectItem>
                    <SelectItem value="related">Related Concepts</SelectItem>
                    <SelectItem value="seo">SEO Keywords</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label htmlFor="wordCount">Word Count: {wordCount}</Label>
                <span className="text-muted-foreground text-sm">{wordCount} words</span>
              </div>
              <Slider
                id="wordCount"
                min={10}
                max={200}
                step={10}
                defaultValue={[50]}
                onValueChange={(value) => setWordCount(value[0])}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              <Tag className="inline-block mr-1 h-4 w-4" />
              {wordType === 'all' ? 'Categories: Synonyms, SEO, Related Terms, Questions' :
                wordType === 'synonyms' ? 'Direct synonyms and alternatives' :
                wordType === 'related' ? 'Related concepts and associated terms' :
                'Search-optimized keyword variations'}
            </div>
            <Button
              onClick={generateWords}
              disabled={isLoading || !keyword.trim() || !user?.id}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Words"
              )}
            </Button>
          </CardFooter>
        </Card>

        {result && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Results</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSaveDialogOpen(true)}
                >
                  <BookmarkIcon className="mr-2 h-4 w-4" />
                  Save Words
                </Button>
                <Button variant="outline" size="sm" onClick={downloadAsCsv}>
                  <Download className="mr-2 h-4 w-4" />
                  Download CSV
                </Button>
              </div>
            </div>

            {/* Save words dialog */}
            <SaveWordsDialog
              words={getAllWords()}
              open={saveDialogOpen}
              onOpenChange={setSaveDialogOpen}
            />

            {/* Display results based on word type */}
            {wordType === 'all' && result.categories ? (
              <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="all">All Categories</TabsTrigger>
                  {Object.keys(result.categories).map(category => (
                    <TabsTrigger key={category} value={category}>
                      {category}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value="all">
                  {renderCategories()}
                </TabsContent>
                {Object.entries(result.categories).map(([category, words]) => (
                  <TabsContent key={category} value={category}>
                    <Card>
                      <CardHeader>
                        <CardTitle>{category}</CardTitle>
                        <CardDescription>{words.length} words</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {words.map((word, i) => (
                            <Badge key={i} variant="secondary" className="text-sm py-1 cursor-pointer hover:bg-muted"
                              onClick={() => copyToClipboard(word)}>
                              {word}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" size="sm" onClick={() => copyToClipboard(words.join('\n'))}>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy {category}
                        </Button>
                      </CardFooter>
                    </Card>
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              renderWordList()
            )}
          </div>
        )}
      </div>
    </div>
  );
}