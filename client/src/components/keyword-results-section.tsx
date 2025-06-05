import { KeywordResearchResult } from "@/lib/types";
import { KeywordResultCard } from "./keyword-result-card";
import { Button } from "./ui/button";
import { Save, SlidersHorizontal, ArrowUpDown, Search } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useState, useMemo } from "react";
import { Slider } from "./ui/slider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

interface KeywordResultsSectionProps {
  results: KeywordResearchResult[];
  selectedKeywords: Set<string>;
  onToggleKeyword: (keyword: string) => void;
  onOpenSaveDialog: () => void;
}

export function KeywordResultsSection({
  results,
  selectedKeywords,
  onToggleKeyword,
  onOpenSaveDialog,
}: KeywordResultsSectionProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [volumeRange, setVolumeRange] = useState([0, 100]);
  const [difficultyRange, setDifficultyRange] = useState([0, 100]);
  const [sortBy, setSortBy] = useState<"volume" | "difficulty" | "competition">("volume");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const maxVolume = useMemo(() => {
    return Math.max(...results.map(r => r.searchVolume));
  }, [results]);

  const filteredResults = useMemo(() => {
    return results
      .filter(keyword => {
        const matchesSearch = keyword.keyword.toLowerCase().includes(searchTerm.toLowerCase());
        const volumePercent = (keyword.searchVolume / maxVolume) * 100;
        const matchesVolume = volumePercent >= volumeRange[0] && volumePercent <= volumeRange[1];
        const matchesDifficulty = (!keyword.difficulty || 
          (keyword.difficulty >= difficultyRange[0] && keyword.difficulty <= difficultyRange[1]));
        return matchesSearch && matchesVolume && matchesDifficulty;
      })
      .sort((a, b) => {
        let aValue = 0, bValue = 0;
        switch (sortBy) {
          case "volume":
            aValue = a.searchVolume;
            bValue = b.searchVolume;
            break;
          case "difficulty":
            aValue = a.difficulty ?? 0;
            bValue = b.difficulty ?? 0;
            break;
          case "competition":
            aValue = a.competition;
            bValue = b.competition;
            break;
        }
        return sortOrder === "desc" ? bValue - aValue : aValue - bValue;
      });
  }, [results, searchTerm, volumeRange, difficultyRange, sortBy, sortOrder, maxVolume]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">
          Results
          <span className="text-sm font-normal text-muted-foreground ml-2">
            Found {filteredResults.length} keywords for your search
          </span>
        </h2>

        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
            className={cn(showFilters && "bg-muted")}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filters
          </Button>

          {selectedKeywords.size > 0 && (
            <Button onClick={onOpenSaveDialog}>
              <Save className="w-4 h-4 mr-2" />
              Save {selectedKeywords.size} Keywords
            </Button>
          )}
        </div>
      </div>

      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle>Filter & Sort Keywords</CardTitle>
            <CardDescription>
              Refine your results by search volume, difficulty, and more
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Search */}
              <div className="space-y-2">
                <Label>Search Keywords</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Type to search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Sort */}
              <div className="space-y-2">
                <Label>Sort By</Label>
                <div className="flex gap-2">
                  <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="volume">Search Volume</SelectItem>
                      <SelectItem value="difficulty">Difficulty</SelectItem>
                      <SelectItem value="competition">Competition</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  >
                    <ArrowUpDown className={cn(
                      "h-4 w-4 transition-transform",
                      sortOrder === "asc" && "rotate-180"
                    )} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Volume Range */}
            <div className="space-y-2">
              <Label>Search Volume Range</Label>
              <Slider
                value={volumeRange}
                onValueChange={setVolumeRange}
                max={100}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{Math.round((maxVolume * volumeRange[0]) / 100).toLocaleString()}</span>
                <span>{Math.round((maxVolume * volumeRange[1]) / 100).toLocaleString()}</span>
              </div>
            </div>

            {/* Difficulty Range */}
            <div className="space-y-2">
              <Label>Difficulty Range</Label>
              <Slider
                value={difficultyRange}
                onValueChange={setDifficultyRange}
                max={100}
                step={1}
                className="py-4"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>{difficultyRange[0]}</span>
                <span>{difficultyRange[1]}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <ScrollArea className="h-[600px] pr-4">
        <div className="space-y-4">
          {filteredResults.map((keyword) => (
            <KeywordResultCard
              key={keyword.keyword}
              keyword={keyword}
              isSelected={selectedKeywords.has(keyword.keyword)}
              onToggleSelect={onToggleKeyword}
            />
          ))}
          {filteredResults.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No keywords match your filters</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
} 