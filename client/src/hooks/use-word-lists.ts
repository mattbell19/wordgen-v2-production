import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Types
interface SavedWord {
  id: number;
  listId: number;
  keyword: string;
  searchVolume: number;
  difficulty: number | null;
  competition: number | null;
  relatedKeywords: string[] | null;
  createdAt: string;
}

interface WordList {
  id: number;
  name: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  savedKeywords: SavedWord[];
}

interface WordListsResponse {
  success: boolean;
  data: WordList[];
}

interface SaveWordsParams {
  listId?: number;
  newListName?: string;
  words: string[];
}

// API endpoints
const API_ENDPOINTS = {
  LISTS: '/api/words/lists',
  SAVE: '/api/words/save',
  DELETE_LIST: (id: number) => `/api/words/lists/${id}`,
  DELETE_WORD: (id: number) => `/api/words/words/${id}`
};

// Hook to manage word lists
export function useWordLists() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all word lists
  const {
    data: wordLists,
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<WordList[]>({
    queryKey: ["wordLists"],
    queryFn: async () => {
      console.log("Fetching word lists...");
      try {
        const response = await fetch(API_ENDPOINTS.LISTS, {
          credentials: "include",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || "Failed to fetch word lists");
          } catch (jsonError) {
            // If the response is not valid JSON, throw a generic error
            console.error("Error parsing JSON response:", jsonError);
            throw new Error(`Failed to fetch word lists: ${response.status} ${response.statusText}`);
          }
        }

        const data: WordListsResponse = await response.json();
        console.log("Word lists fetched successfully:", data.data.length);
        return data.data;
      } catch (error) {
        console.error("Error fetching word lists:", error);
        throw error;
      }
    },
    // Don't use initialData to force a fetch
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: 'always', // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gets focus
    retry: 3, // Retry failed requests 3 times
    retryDelay: 1000, // Wait 1 second between retries
  });

  // Create a new list
  const createList = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(API_ENDPOINTS.LISTS, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
        credentials: "include",
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to create list");
        } catch (jsonError) {
          // If the response is not valid JSON, throw a generic error
          console.error("Error parsing JSON response:", jsonError);
          throw new Error(`Failed to create list: ${response.status} ${response.statusText}`);
        }
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate the word lists query to refetch data
      queryClient.invalidateQueries({ queryKey: ["wordLists"] });
      toast({
        title: "Success",
        description: "Word list created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create word list",
        variant: "destructive",
      });
    },
  });

  // Save words to a list
  const saveWords = useMutation({
    mutationFn: async (params: SaveWordsParams) => {
      const response = await fetch(API_ENDPOINTS.SAVE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save words");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wordLists"] });
      toast({
        title: "Success",
        description: "Words saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save words",
        variant: "destructive",
      });
    },
  });

  // Delete a list
  const deleteList = useMutation({
    mutationFn: async (listId: number) => {
      const response = await fetch(API_ENDPOINTS.DELETE_LIST(listId), {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete list");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wordLists"] });
      toast({
        title: "Success",
        description: "Word list deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete word list",
        variant: "destructive",
      });
    },
  });

  // Delete a word
  const deleteWord = useMutation({
    mutationFn: async (wordId: number) => {
      const response = await fetch(API_ENDPOINTS.DELETE_WORD(wordId), {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to delete word");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wordLists"] });
      toast({
        title: "Success",
        description: "Word deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete word",
        variant: "destructive",
      });
    },
  });

  return {
    wordLists,
    isLoading,
    isError,
    error,
    refetch,
    createList,
    saveWords,
    deleteList,
    deleteWord,
  };
}