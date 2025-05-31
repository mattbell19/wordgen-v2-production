import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Edit2, Trash2, ChevronRight, Plus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useKeywordLists } from "@/hooks/use-keyword-lists";
import type { SelectKeywordList, SelectSavedKeyword } from "@db/schema";

interface SavedKeyword extends Omit<SelectSavedKeyword, 'difficulty' | 'competition' | 'relatedKeywords'> {
  difficulty?: number | null;
  competition?: number | null;
  relatedKeywords?: string[] | null;
}

interface KeywordList extends SelectKeywordList {
  id: number;
  name: string;
  userId: number;
  savedKeywords: SavedKeyword[];
}

const editListSchema = z.object({
  name: z.string().min(1, "List name is required"),
});

const createListSchema = z.object({
  name: z.string().min(1, "List name is required"),
});

export default function SavedLists() {
  const { toast } = useToast();
  const [selectedList, setSelectedList] = useState<KeywordList | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { lists = [], isLoading, refetchLists } = useKeywordLists();

  // Fetch lists when component mounts, but prevent infinite loops
  useEffect(() => {
    let mounted = true;

    const fetchData = async () => {
      try {
        if (mounted) {
          await queryClient.prefetchQuery({ 
            queryKey: ['/api/keywords/lists'],
            staleTime: 0
          });
        }
      } catch (error) {
        console.error('Failed to fetch lists:', error);
        if (mounted) {
          toast({
            title: "Error",
            description: "Failed to load keyword lists. Please try again.",
            variant: "destructive",
          });
        }
      }
    };

    fetchData();

    // Cleanup subscription on unmount
    return () => {
      mounted = false;
    };
  }, []); // Only run on mount

  const editForm = useForm<z.infer<typeof editListSchema>>({
    resolver: zodResolver(editListSchema),
    defaultValues: {
      name: selectedList?.name || "",
    },
  });

  const createForm = useForm<z.infer<typeof createListSchema>>({
    resolver: zodResolver(createListSchema),
    defaultValues: {
      name: "",
    },
  });

  const createList = useMutation({
    mutationFn: async (data: z.infer<typeof createListSchema>) => {
      const response = await fetch("/api/keywords/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create list");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsCreateDialogOpen(false);
      createForm.reset();
      refetchLists();
      toast({
        title: "Success",
        description: "List created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const editList = useMutation({
    mutationFn: async ({ id, name }: { id: number; name: string }) => {
      const response = await fetch(`/api/keywords/lists/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update list");
      }

      return response.json();
    },
    onSuccess: () => {
      setIsEditDialogOpen(false);
      refetchLists();
      editForm.reset();
      toast({
        title: "Success",
        description: "List name updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteList = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/keywords/lists/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete list");
      }
    },
    onSuccess: () => {
      refetchLists();
      setSelectedList(null);
      toast({
        title: "Success",
        description: "List deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleEditSubmit = (data: z.infer<typeof editListSchema>) => {
    if (selectedList) {
      editList.mutate({ id: selectedList.id, name: data.name });
    }
  };

  const handleCreateSubmit = (data: z.infer<typeof createListSchema>) => {
    createList.mutate(data);
  };

  const handleDeleteList = (id: number) => {
    if (confirm("Are you sure you want to delete this list?")) {
      deleteList.mutate(id);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Saved Keyword Lists
          </h1>
          <p className="text-muted-foreground">
            Manage your saved keyword lists and research data
          </p>
        </div>

        <div className="grid md:grid-cols-[300px_1fr] gap-6">
          <Card className="h-[600px]">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="font-medium">Your Lists</div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      New List
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New List</DialogTitle>
                      <DialogDescription>
                        Create a new keyword list to organize your research
                      </DialogDescription>
                    </DialogHeader>
                    <Form {...createForm}>
                      <form onSubmit={createForm.handleSubmit(handleCreateSubmit)} className="space-y-4">
                        <FormField
                          control={createForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>List Name</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter list name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <DialogFooter>
                          <Button type="submit" disabled={createList.isPending}>
                            {createList.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                              </>
                            ) : (
                              "Create List"
                            )}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </div>
              <ScrollArea className="h-[520px]">
                <div className="space-y-2">
                  {lists.map((list) => (
                    <div
                      key={list.id}
                      className={`p-3 rounded-lg cursor-pointer flex items-center justify-between group hover:bg-muted ${
                        selectedList?.id === list.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedList(list as KeywordList)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="truncate">{list.name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({list.savedKeywords.length})
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground invisible group-hover:visible" />
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="h-[600px]">
            <CardContent className="p-6">
              {selectedList ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">{selectedList.name}</h2>
                    <div className="flex gap-2">
                      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit List Name</DialogTitle>
                            <DialogDescription>
                              Change the name of your keyword list
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...editForm}>
                            <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className="space-y-4">
                              <FormField
                                control={editForm.control}
                                name="name"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>List Name</FormLabel>
                                    <FormControl>
                                      <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <DialogFooter>
                                <Button type="submit" disabled={editList.isPending}>
                                  {editList.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Saving...
                                    </>
                                  ) : (
                                    "Save Changes"
                                  )}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteList(selectedList.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <ScrollArea className="h-[450px]">
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-4 px-4 py-2 bg-muted rounded-md text-sm font-medium">
                        <div className="col-span-3">Keyword</div>
                        <div className="col-span-2 text-right">Search Volume</div>
                        <div className="col-span-2 text-right">Difficulty</div>
                        <div className="col-span-2 text-right">Competition</div>
                        <div className="col-span-3">Related Keywords</div>
                      </div>

                      {selectedList.savedKeywords.map((keyword) => (
                        <Card key={keyword.id} className="border-muted">
                          <CardContent className="p-4">
                            <div className="grid grid-cols-12 gap-4 items-center">
                              <div className="col-span-3 font-medium truncate" title={keyword.keyword}>
                                {keyword.keyword}
                              </div>
                              <div className="col-span-2 text-right">
                                {keyword.searchVolume.toLocaleString()}
                              </div>
                              <div className="col-span-2 text-right">
                                {keyword.difficulty ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full"
                                        style={{
                                          width: `${keyword.difficulty}%`,
                                          backgroundColor:
                                            keyword.difficulty > 66
                                              ? "var(--destructive)"
                                              : keyword.difficulty > 33
                                              ? "var(--warning)"
                                              : "var(--success)",
                                        }}
                                      />
                                    </div>
                                    {keyword.difficulty}%
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </div>
                              <div className="col-span-2 text-right">
                                {keyword.competition ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full"
                                        style={{
                                          width: `${keyword.competition}%`,
                                          backgroundColor:
                                            keyword.competition > 66
                                              ? "var(--destructive)"
                                              : keyword.competition > 33
                                              ? "var(--warning)"
                                              : "var(--success)",
                                        }}
                                      />
                                    </div>
                                    {keyword.competition}%
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </div>
                              <div className="col-span-3">
                                {keyword.relatedKeywords?.length ? (
                                  <div className="flex flex-wrap gap-1">
                                    {keyword.relatedKeywords.map((related, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted"
                                        title={related}
                                      >
                                        {related}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Select a list to view its keywords
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}