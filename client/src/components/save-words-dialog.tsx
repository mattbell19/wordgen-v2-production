import { useState } from "react";
import { Check, PlusCircle, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWordLists } from "@/hooks/use-word-lists";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SaveWordsDialogProps {
  words: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function SaveWordsDialog({ words, open, onOpenChange, trigger }: SaveWordsDialogProps) {
  const { wordLists, createList, saveWords } = useWordLists();
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [newListName, setNewListName] = useState("");
  const [saveMethod, setSaveMethod] = useState<"existing" | "new">("existing");
  const [isLoading, setIsLoading] = useState(false);
  
  // Function to handle saving words
  const handleSave = async () => {
    if ((saveMethod === "existing" && !selectedListId) || 
        (saveMethod === "new" && !newListName.trim())) {
      return;
    }

    setIsLoading(true);
    
    try {
      if (saveMethod === "existing") {
        await saveWords.mutateAsync({
          listId: parseInt(selectedListId),
          words,
        });
      } else {
        await saveWords.mutateAsync({
          newListName: newListName.trim(),
          words,
        });
      }
      
      // Close dialog on success
      onOpenChange(false);
      
      // Reset form
      setSelectedListId("");
      setNewListName("");
      setSaveMethod("existing");
    } catch (error) {
      console.error("Error saving words:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Words</DialogTitle>
          <DialogDescription>
            Save selected words to one of your word lists or create a new list.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          <Tabs 
            defaultValue="existing" 
            value={saveMethod}
            onValueChange={(value) => setSaveMethod(value as "existing" | "new")}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing">Existing List</TabsTrigger>
              <TabsTrigger value="new">New List</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {saveMethod === "existing" ? (
            <div className="space-y-2">
              <Label htmlFor="list">Select a list</Label>
              <Select
                value={selectedListId}
                onValueChange={setSelectedListId}
                disabled={isLoading || wordLists.length === 0}
              >
                <SelectTrigger id="list">
                  <SelectValue placeholder={wordLists.length === 0 ? "No lists available" : "Select a list"} />
                </SelectTrigger>
                <SelectContent>
                  {wordLists.map((list) => (
                    <SelectItem key={list.id} value={list.id.toString()}>
                      {list.name} ({list.savedKeywords.length} words)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {wordLists.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  You don't have any word lists yet. Create a new one.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="new-list">New list name</Label>
              <Input
                id="new-list"
                placeholder="Enter a name for your new list"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Selected Words ({words.length})</Label>
            <ScrollArea className="h-32 w-full rounded-md border">
              <div className="p-4 flex flex-wrap gap-1.5">
                {words.map((word, index) => (
                  <Badge key={index} variant="secondary">
                    {word}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
        
        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading || (saveMethod === "existing" && !selectedListId) || (saveMethod === "new" && !newListName.trim())}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">
                  <Loader2 size={16} />
                </span>
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Words
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 