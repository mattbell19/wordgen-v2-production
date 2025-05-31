import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SelectKeywordList, InsertSavedKeyword } from "@db/schema";
import { useToast } from "@/hooks/use-toast";

type KeywordListResponse = SelectKeywordList & {
  savedKeywords: InsertSavedKeyword[];
};

// Helper function to clean keyword data
function cleanKeywordData(keyword: string): string {
  // If the keyword contains the AI message format, extract just the keyword
  if (keyword.includes('would you like me to save these to a keyword list?')) {
    const match = keyword.match(/"([^"]+)"\s*\((\d+,?\d*)\s*monthly searches\)/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  // Otherwise just return the clean keyword
  return keyword.split(' - ')[0].trim();
}

export function useKeywordLists() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lists, isLoading } = useQuery<KeywordListResponse[]>({
    queryKey: ['/api/keywords/lists'],
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Don't cache the data
    retry: 3, // Retry failed requests 3 times
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Clean the keyword data before returning it
    select: (data) => {
      return data.map(list => ({
        ...list,
        savedKeywords: list.savedKeywords.map(kw => ({
          ...kw,
          keyword: cleanKeywordData(kw.keyword)
        }))
      }));
    },
    // Handle errors gracefully
    onError: (error: Error) => {
      console.error('Failed to fetch keyword lists:', error);
      toast({
        title: "Error",
        description: "Failed to load keyword lists. Please try again.",
        variant: "destructive",
      });
    }
  });

  const saveKeywords = useMutation({
    mutationFn: async (data: { listId?: number; newListName?: string; keywords: any[] }) => {
      const response = await fetch('/api/keywords/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          keywords: data.keywords.map(kw => ({
            ...kw,
            keyword: cleanKeywordData(kw.keyword)
          }))
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      return response.json();
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['/api/keywords/lists'] });
      const previousLists = queryClient.getQueryData(['/api/keywords/lists']);
      return { previousLists };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keywords/lists'] });
      toast({
        title: "Success",
        description: "Keywords saved successfully",
      });
    },
    onError: (error: Error, _variables, context) => {
      if (context?.previousLists) {
        queryClient.setQueryData(['/api/keywords/lists'], context.previousLists);
      }
      queryClient.invalidateQueries({ queryKey: ['/api/keywords/lists'] });
      toast({
        title: "Error",
        description: error.message || "Failed to save keywords",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/keywords/lists'] });
    },
  });

  return {
    lists: lists || [],
    isLoading,
    saveKeywords: saveKeywords.mutateAsync,
    refetchLists: () => queryClient.invalidateQueries({ queryKey: ['/api/keywords/lists'] }),
  };
}