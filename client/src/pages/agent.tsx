import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Bot, User, Send, Sparkles, Save, MessageSquare, SearchIcon as Search, FileTextIcon as FileSearch, History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useKeywordLists } from "@/hooks/use-keyword-lists";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    suggestedKeywords?: string[];
    contentSuggestions?: string[];
    technicalTips?: string[];
    commandResponse?: {
      type: string;
      data?: {
        keywords?: any[];
        saved?: boolean;
      };
    };
    isWelcome?: boolean;
  };
}

interface Conversation {
  id: number;
  title: string;
  updatedAt: string;
}

export default function AgentPage() {
  const [input, setInput] = useState("");
  const [selectedListId, setSelectedListId] = useState<string>("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [currentKeywords, setCurrentKeywords] = useState<any[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const { lists } = useKeywordLists();
  const { toast } = useToast();

  // AI agent feature temporarily disabled
  const conversations = [];

  // Commented out to disable AI agent feature
  /*
  const { data: conversations } = useQuery({
    queryKey: ['/api/ai/conversations'],
    queryFn: async () => {
      const response = await fetch('/api/ai/conversations');
      if (!response.ok) throw new Error('Failed to fetch conversations');
      return response.json() as Promise<Conversation[]>;
    },
    retry: false,
    refetchOnWindowFocus: false,
  });
  */

  // AI agent feature temporarily disabled
  const sendMessage = useMutation({
    mutationFn: async ({ content, listId }: { content: string, listId?: string }) => {
      // Mock response for disabled AI agent
      console.log('AI agent disabled, using mock response for:', content);

      // Create a mock response based on the content
      let mockResponse = {
        message: "The AI agent feature is currently disabled. We're working on improving it and will bring it back soon!",
        conversationId: null,
        insights: {},
        commandResponse: null
      };

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500));

      return mockResponse;
    },
    onSuccess: (data) => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        metadata: {
          ...data.insights,
          commandResponse: data.commandResponse
        }
      }]);

      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId);
      }

      if (data.commandResponse?.type === 'keywords') {
        const keywords = data.commandResponse.data?.keywords || [];

        if (keywords.length > 0) {
          setCurrentKeywords(keywords);

          if (!data.commandResponse.data?.saved) {
            setTimeout(() => setShowSaveDialog(true), 500);
          } else {
            toast({
              title: "Keywords Saved",
              description: `Successfully saved ${keywords.length} keywords to your list.`
            });
          }
        }
      }

      if (data.insights?.suggestedKeywords?.length > 0) {
        toast({
          title: "Keywords Identified",
          description: `Found ${data.insights.suggestedKeywords.length} relevant keywords for your topic.`,
        });
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send message. Please try again.",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    sendMessage.mutate({ content: input });
  };

  const handleSaveKeywords = async () => {
    if (currentKeywords.length > 0 && selectedListId) {
      const lastUserMessage = messages.findLast(m => m.role === 'user');
      if (lastUserMessage) {
        sendMessage.mutate({
          content: lastUserMessage.content,
          listId: selectedListId
        });
        setShowSaveDialog(false);
        setCurrentKeywords([]);
        setSelectedListId("");
      }
    }
  };

  const [messages, setMessages] = useState<Message[]>([{
    role: 'assistant',
    content: "The AI agent feature is currently disabled. We're working on improving it and will bring it back soon! In the meantime, you can use our other tools like the Article Writer and Keyword Research features.",
    metadata: {
      isWelcome: true
    }
  }]);

  // AI agent feature temporarily disabled
  const handleConversationSelect = async (conversationId: number) => {
    try {
      // Mock response for disabled AI agent
      console.log('AI agent disabled, conversation selection not available');

      toast({
        variant: "default",
        title: "Feature Disabled",
        description: "The AI agent feature is currently disabled.",
      });

      // No-op for now
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load conversation. Please try again.",
      });
    }
  };

  const renderInsights = (message: Message) => {
    if (!message.metadata) return null;

    const insights = message.metadata;
    const commandResponse = insights.commandResponse;

    return (
      <div className="mt-2 space-y-2 text-sm">
        {commandResponse?.type === 'keywords' && !commandResponse.data?.saved && currentKeywords.length > 0 && (
          <div className="flex items-start gap-2">
            <Save className="h-4 w-4 mt-1 text-primary" />
            <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Save Keywords to List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Save Keywords</DialogTitle>
                  <DialogDescription>
                    Choose a list to save these keywords or create a new one.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Select List</Label>
                    <Select value={selectedListId} onValueChange={setSelectedListId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a list..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lists?.map((list) => (
                          <SelectItem key={list.id} value={list.id.toString()}>
                            {list.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleSaveKeywords}
                    disabled={!selectedListId || sendMessage.isPending}
                  >
                    Save Keywords
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {(!commandResponse || commandResponse.type !== 'keywords') && (
          <>
            {insights.suggestedKeywords && insights.suggestedKeywords.length > 0 && (
              <div className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-1 text-primary" />
                <div>
                  <p className="font-medium">Keywords:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {insights.suggestedKeywords.map((keyword, i) => (
                      <span key={i} className="px-2 py-1 bg-primary/10 rounded-full text-xs">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {insights.contentSuggestions && insights.contentSuggestions.length > 0 && (
              <div className="flex items-start gap-2">
                <FileSearch className="h-4 w-4 mt-1 text-primary" />
                <div>
                  <p className="font-medium">Content Suggestions:</p>
                  <ul className="list-disc list-inside mt-1">
                    {insights.contentSuggestions.map((suggestion, i) => (
                      <li key={i}>{suggestion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {insights.technicalTips && insights.technicalTips.length > 0 && (
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 mt-1 text-primary" />
                <div>
                  <p className="font-medium">Technical Tips:</p>
                  <ul className="list-disc list-inside mt-1">
                    {insights.technicalTips.map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 max-w-4xl">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Notice:</strong> The AI agent feature is currently disabled. We're working on improving it and will bring it back soon!
              </p>
            </div>
          </div>
        </div>
        <div className="flex justify-between items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-primary">AI SEO Assistant</h1>
            <p className="text-muted-foreground">Your intelligent SEO optimization companion</p>
          </div>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="gap-2">
                <History className="h-4 w-4" />
                Chat History
              </Button>
            </SheetTrigger>
            <SheetContent className="w-[400px] sm:w-[540px]">
              <SheetHeader className="pb-4">
                <SheetTitle>Previous Conversations</SheetTitle>
                <SheetDescription>
                  Continue your previous chats or start a new conversation
                </SheetDescription>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-200px)] pr-4">
                <div className="space-y-2">
                  {conversations?.map((conversation) => (
                    <Button
                      key={conversation.id}
                      variant={currentConversationId === conversation.id ? "default" : "ghost"}
                      className="w-full justify-start h-auto py-3"
                      onClick={() => handleConversationSelect(conversation.id)}
                    >
                      <MessageSquare className="h-4 w-4 mr-3 flex-shrink-0" />
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium truncate max-w-[200px]">
                          {conversation.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(conversation.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>

        <Card className="border-2">
          <CardContent className="p-6">
            <ScrollArea className="h-[600px] pr-4">
              <div className="space-y-6">
                {messages.map((message, i) => (
                  <div
                    key={i}
                    className={cn(
                      "flex gap-3",
                      message.role === "assistant" ? "justify-start" : "justify-end"
                    )}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Bot className="h-5 w-5 text-primary" />
                        </div>
                      </div>
                    )}
                    <div
                      className={cn(
                        "rounded-lg p-4 max-w-[80%]",
                        message.role === "assistant"
                          ? "bg-muted shadow-sm"
                          : "bg-primary text-primary-foreground shadow-sm"
                      )}
                    >
                      <div className="whitespace-pre-wrap text-sm leading-relaxed">
                        {message.content}
                      </div>
                      {message.role === "assistant" && renderInsights(message)}
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-5 w-5 text-primary-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit} className="flex gap-3 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about SEO or use commands like /analyze, /keywords..."
            className="flex-1"
          />
          <Button type="submit" disabled={sendMessage.isPending} size="icon" className="h-10 w-10">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}