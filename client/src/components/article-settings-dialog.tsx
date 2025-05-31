import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useArticleSettings } from "@/hooks/use-article-settings";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSitemap } from "@/hooks/use-sitemap";
import { useSearchUsage } from "@/hooks/use-search-usage";
import ArticleStructureSettings from "./article-structure-settings";

export function ArticleSettingsDialog() {
  const [open, setOpen] = useState(false);
  const [structureSettingsOpen, setStructureSettingsOpen] = useState(false);
  const [wordCountMode, setWordCountMode] = useState<'slider' | 'preset' | 'custom'>('slider');
  const [customWordCount, setCustomWordCount] = useState<string>('');
  const { settings, updateSettings } = useArticleSettings();
  const { hasSitemap, isLoading: isSitemapLoading } = useSitemap();
  const { usage, isLoading: isUsageLoading, hasQuotaRemaining } = useSearchUsage();
  const form = useForm({
    defaultValues: settings,
  });

  // Disable internal linking if no sitemap is available
  useEffect(() => {
    if (!isSitemapLoading && !hasSitemap && settings.enableInternalLinking) {
      updateSettings({ enableInternalLinking: false });
    }
  }, [hasSitemap, isSitemapLoading, settings.enableInternalLinking, updateSettings]);

  // Disable external linking if no search quota remaining
  useEffect(() => {
    if (!isUsageLoading && !hasQuotaRemaining && settings.enableExternalLinking) {
      updateSettings({ enableExternalLinking: false });
    }
  }, [hasQuotaRemaining, isUsageLoading, settings.enableExternalLinking, updateSettings]);

  // Set the appropriate mode when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);

    if (isOpen) {
      // Check if current word count matches a preset
      const presetValues = [500, 1000, 1500, 2000, 3000];
      const currentWordCount = settings.wordCount;

      if (presetValues.includes(currentWordCount)) {
        setWordCountMode('preset');
      } else if (currentWordCount < 500 || currentWordCount > 3000 || currentWordCount % 250 !== 0) {
        // If not a slider value (not divisible by 250 or outside slider range)
        setWordCountMode('custom');
        setCustomWordCount(currentWordCount.toString());
      } else {
        setWordCountMode('slider');
      }
    }
  };

  // Validate custom word count
  const validateCustomWordCount = (value: string): boolean => {
    const count = parseInt(value, 10);
    return !isNaN(count) && count >= 100 && count <= 10000;
  };

  const onSubmit = (values: typeof settings) => {
    // If in custom mode, use the custom word count value
    if (wordCountMode === 'custom' && customWordCount) {
      const customCount = parseInt(customWordCount, 10);
      if (validateCustomWordCount(customWordCount)) {
        values.wordCount = customCount;
      } else {
        // If invalid, don't submit and show error
        return;
      }
    }

    updateSettings(values);
    setOpen(false);
  };

  const handleStructureSettingsSave = (structureSettings: any) => {
    updateSettings({
      structure: structureSettings
    });
    setStructureSettingsOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Article Settings</DialogTitle>
          <DialogDescription>
            Customize your article generation preferences. These settings will be used for all new articles.
          </DialogDescription>
        </DialogHeader>
        <Separator className="my-4" />
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="wordCount"
              render={({ field: { value, onChange } }) => (
                <FormItem>
                  <FormLabel>Word Count</FormLabel>
                  <FormDescription className="flex justify-between items-center">
                    <span>Target word count for generated articles</span>
                    <span className="font-mono text-sm">
                      {wordCountMode === 'custom' && customWordCount ? customWordCount : value} words
                    </span>
                  </FormDescription>
                  <Tabs
                    defaultValue="slider"
                    value={wordCountMode}
                    onValueChange={(value) => setWordCountMode(value as 'slider' | 'preset' | 'custom')}
                    className="w-full"
                  >
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="slider">Slider</TabsTrigger>
                      <TabsTrigger value="preset">Presets</TabsTrigger>
                      <TabsTrigger value="custom">Custom</TabsTrigger>
                    </TabsList>
                    <TabsContent value="slider" className="pt-4">
                      <FormControl>
                        <Slider
                          value={[value]}
                          onValueChange={([newValue]) => onChange(newValue)}
                          min={500}
                          max={3000}
                          step={250}
                          className="[&_[role=slider]]:h-4 [&_[role=slider]]:w-4"
                        />
                      </FormControl>
                    </TabsContent>
                    <TabsContent value="preset" className="pt-4">
                      <RadioGroup
                        defaultValue={value.toString()}
                        onValueChange={(val) => onChange(parseInt(val, 10))}
                        className="flex flex-col space-y-2"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="500" id="r1" />
                          <label htmlFor="r1" className="text-sm font-medium">500 words (Short)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1000" id="r2" />
                          <label htmlFor="r2" className="text-sm font-medium">1000 words (Medium)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="1500" id="r3" />
                          <label htmlFor="r3" className="text-sm font-medium">1500 words (Standard)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="2000" id="r4" />
                          <label htmlFor="r4" className="text-sm font-medium">2000 words (Long)</label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="3000" id="r5" />
                          <label htmlFor="r5" className="text-sm font-medium">3000 words (Comprehensive)</label>
                        </div>
                      </RadioGroup>
                    </TabsContent>
                    <TabsContent value="custom" className="pt-4">
                      <div className="space-y-2">
                        <Input
                          type="number"
                          placeholder="Enter exact word count"
                          value={customWordCount}
                          onChange={(e) => setCustomWordCount(e.target.value)}
                          min="100"
                          max="10000"
                          className={cn(
                            "w-full",
                            customWordCount && !validateCustomWordCount(customWordCount) && "border-destructive"
                          )}
                        />
                        <p className="text-xs text-muted-foreground">
                          Enter any word count between 100 and 10,000 words
                        </p>
                        {customWordCount && !validateCustomWordCount(customWordCount) && (
                          <p className="text-xs text-destructive">
                            Please enter a valid word count between 100 and 10,000
                          </p>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="writingStyle"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Writing Style</FormLabel>
                  <FormDescription>
                    Choose the tone and style for your articles
                  </FormDescription>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select writing style" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="language"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Language</FormLabel>
                  <FormDescription>
                    Select the primary language for your articles
                  </FormDescription>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select language" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="spanish">Spanish</SelectItem>
                      <SelectItem value="french">French</SelectItem>
                      <SelectItem value="german">German</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="enableInternalLinking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel>Internal Linking</FormLabel>
                    <FormDescription className="flex justify-between">
                      <span>Automatically add relevant internal links from your sitemap</span>
                      <a
                        href="/settings/sitemap"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open('/settings/sitemap', '_blank');
                        }}
                      >
                        Manage Sitemap
                      </a>
                    </FormDescription>
                    {!isSitemapLoading && !hasSitemap && (
                      <p className="text-xs text-destructive mt-1">
                        You need to add a sitemap first to enable internal linking
                      </p>
                    )}
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!hasSitemap}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="enableExternalLinking"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between space-y-0">
                  <div className="space-y-0.5">
                    <FormLabel>External Linking</FormLabel>
                    <FormDescription className="flex justify-between">
                      <span>Add relevant, authoritative external links to enhance credibility</span>
                      <a
                        href="/settings/search-usage"
                        className="text-xs text-primary hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          window.open('/settings/search-usage', '_blank');
                        }}
                      >
                        View Usage
                      </a>
                    </FormDescription>
                    {!isUsageLoading && usage && (
                      <p className={cn(
                        "text-xs mt-1",
                        !hasQuotaRemaining ? "text-destructive" : "text-muted-foreground"
                      )}>
                        Search usage: {usage.searchesUsed}/{usage.searchLimit} this month
                        {!hasQuotaRemaining && (
                          <span className="block font-medium">
                            You've reached your search limit for external linking
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={!hasQuotaRemaining}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="callToAction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Call to Action</FormLabel>
                  <FormDescription>
                    Add a call-to-action at the end of your article to engage readers
                  </FormDescription>
                  <FormControl>
                    <Input
                      placeholder="E.g., Contact us today for a free consultation!"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Article Structure</FormLabel>
              <Button
                type="button"
                variant="outline"
                onClick={() => setStructureSettingsOpen(true)}
                className="w-full"
              >
                Customize Article Structure
              </Button>
              <FormDescription>
                Customize sections, visual elements, and SEO features.
              </FormDescription>
            </div>

            <Button type="submit" className="w-full">
              Save Settings
            </Button>
          </form>
        </Form>
      </DialogContent>

      {/* Article Structure Settings Dialog */}
      <ArticleStructureSettings
        open={structureSettingsOpen}
        onClose={() => setStructureSettingsOpen(false)}
        onSave={handleStructureSettingsSave}
        initialSettings={settings.structure}
      />
    </Dialog>
  );
}