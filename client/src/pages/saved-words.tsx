import { useState, useEffect } from "react";
import { useWordLists } from "@/hooks/use-word-lists";
import { Loader2, PlusCircle, Trash2, Copy, Download, SearchX, X, BookmarkIcon } from "lucide-react";
import { SaveWordsDialog } from "@/components/save-words-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export default function SavedWordsPage() {
  // Destructure with proper typing to avoid undefined issues
  const { wordLists = [], isLoading, isError, createList, deleteList, deleteWord } = useWordLists();
  const [newListName, setNewListName] = useState("");
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [wordsToSave, setWordsToSave] = useState<string[]>([]);
  const { toast } = useToast();

  // Get the selected list
  const selectedList = selectedListId && wordLists
    ? wordLists.find(list => list.id === selectedListId)
    : null;

  // Set the first list as selected if none is selected and lists are available
  useEffect(() => {
    if (wordLists && wordLists.length > 0 && !selectedListId) {
      setSelectedListId(wordLists[0].id);
    }
  }, [wordLists, selectedListId]);

  // Function to handle list creation
  const handleCreateList = async () => {
    if (!newListName.trim()) return;

    setIsCreatingList(true);

    try {
      await createList.mutateAsync(newListName.trim());
      setNewListName("");
      setCreateDialogOpen(false);
    } catch (error) {
      console.error("Error creating list:", error);
    } finally {
      setIsCreatingList(false);
    }
  };

  // Function to handle list deletion
  const handleDeleteList = async (listId: number) => {
    if (confirm("Are you sure you want to delete this list? This action cannot be undone.")) {
      try {
        await deleteList.mutateAsync(listId);
        if (selectedListId === listId) {
          setSelectedListId(null);
        }
      } catch (error) {
        console.error("Error deleting list:", error);
      }
    }
  };

  // Function to handle word deletion
  const handleDeleteWord = async (wordId: number) => {
    try {
      await deleteWord.mutateAsync(wordId);
    } catch (error) {
      console.error("Error deleting word:", error);
    }
  };

  // Function to copy words to clipboard
  const copyToClipboard = (words: string[]) => {
    navigator.clipboard.writeText(words.join("\n")).then(
      () => {
        toast({
          title: "Copied to clipboard",
          description: `${words.length} words copied to clipboard`,
        });
      },
      () => {
        toast({
          title: "Failed to copy",
          description: "Could not copy to clipboard",
          variant: "destructive",
        });
      }
    );
  };

  // Function to handle adding new words to a list
  const handleAddWords = () => {
    if (selectedList) {
      setWordsToSave(selectedList.savedKeywords.map(word => word.keyword));
      setSaveDialogOpen(true);
    }
  };

  // Function to download words as CSV
  const downloadAsCsv = (listName: string, words: string[]) => {
    const csvContent = "Word\n" + words.map(word => `"${word.replace(/"/g, '""')}"`).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${listName.replace(/\s+/g, '-')}-words.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter words based on search query
  const getFilteredWords = (words: { id: number, keyword: string }[]) => {
    if (!searchQuery.trim()) return words;

    return words.filter(word =>
      word.keyword.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your saved words...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container py-8 max-w-6xl mx-auto">
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load your saved word lists. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl mx-auto">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Saved Words</h1>
            <p className="text-muted-foreground mt-1">
              Manage your saved word lists
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-1">
                <PlusCircle className="h-4 w-4" />
                <span>New List</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New List</DialogTitle>
                <DialogDescription>
                  Enter a name for your new word list.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="name" className="text-right">
                    Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="My Word List"
                    className="col-span-3"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                  disabled={isCreatingList}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateList}
                  disabled={!newListName.trim() || isCreatingList}
                >
                  {isCreatingList ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : 'Create List'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {wordLists.length === 0 ? (
          <Card className="w-full">
            <CardHeader>
              <CardTitle>No Saved Words</CardTitle>
              <CardDescription>
                You haven't saved any words yet. Generate words using the Word Generator and save them to a list.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center p-10">
              <SearchX className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-center text-muted-foreground">
                Your saved words will appear here once you create some lists.
              </p>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button onClick={() => setCreateDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create Your First List
              </Button>
            </CardFooter>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Lists sidebar */}
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader className="px-4 py-3">
                  <CardTitle className="text-lg">Your Lists</CardTitle>
                </CardHeader>
                <CardContent className="px-2">
                  <div className="space-y-1">
                    {wordLists.map((list) => (
                      <button
                        key={list.id}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-left hover:bg-muted transition-colors ${
                          selectedListId === list.id ? "bg-muted" : ""
                        }`}
                        onClick={() => setSelectedListId(list.id)}
                      >
                        <div>
                          <span className="font-medium">{list.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            {list.savedKeywords.length} words
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteList(list.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </button>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="px-4 py-3">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    New List
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Words content */}
            <div className="md:col-span-3">
              {selectedList ? (
                <Card className="h-full">
                  <CardHeader className="flex-row items-center justify-between space-y-0 gap-4">
                    <div>
                      <CardTitle>{selectedList.name}</CardTitle>
                      <CardDescription>
                        {selectedList.savedKeywords.length} saved words
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(selectedList.savedKeywords.map(word => word.keyword))}
                        disabled={selectedList.savedKeywords.length === 0}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        Copy All
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => downloadAsCsv(
                          selectedList.name,
                          selectedList.savedKeywords.map(word => word.keyword)
                        )}
                        disabled={selectedList.savedKeywords.length === 0}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Download CSV
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddWords}
                        disabled={selectedList.savedKeywords.length === 0}
                      >
                        <BookmarkIcon className="mr-2 h-4 w-4" />
                        Save Words
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    {selectedList.savedKeywords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-10">
                        <SearchX className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-center text-muted-foreground">
                          This list is empty. Add words from the Word Generator.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <Input
                            placeholder="Search words..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <ScrollArea className="h-[calc(100vh-350px)] w-full">
                          <div className="flex flex-wrap gap-2 p-1">
                            {getFilteredWords(selectedList.savedKeywords).map((word) => (
                              <Badge
                                key={word.id}
                                variant="secondary"
                                className="text-sm py-1.5 pl-3 pr-2 flex items-center gap-1 hover:bg-muted"
                              >
                                <span
                                  className="cursor-pointer"
                                  onClick={() => copyToClipboard([word.keyword])}
                                >
                                  {word.keyword}
                                </span>
                                <button
                                  className="h-5 w-5 rounded-full ml-1 hover:bg-background flex items-center justify-center"
                                  onClick={() => handleDeleteWord(word.id)}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}

                            {getFilteredWords(selectedList.savedKeywords).length === 0 && (
                              <div className="w-full p-4 text-center text-muted-foreground">
                                No words match your search query.
                              </div>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-full flex flex-col items-center justify-center p-10">
                  <div className="text-center space-y-3">
                    <SearchX className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-medium">No List Selected</h3>
                    <p className="text-muted-foreground">
                      Select a list from the sidebar to view its contents.
                    </p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Save words dialog */}
      <SaveWordsDialog
        words={wordsToSave}
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
      />
    </div>
  );
}