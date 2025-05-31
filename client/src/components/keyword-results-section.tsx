import { KeywordResearchResult } from "@/lib/types";
import { KeywordResultCard } from "./keyword-result-card";
import { Button } from "./ui/button";
import { Save, SlidersHorizontal } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { useState, useMemo } from "react";
import { Slider } from "./ui/slider";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";

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
  onOpenSaveDialog
}: KeywordResultsSectionProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [volumeRange, setVolumeRange] = useState<[number, number]>([0, 100000]);
  const [difficultyRange, setDifficultyRange] = useState<[number, number]>([0, 100]);

  // Get min/max values for the ranges
  const ranges = useMemo(() => {
    if (!results.length) return null;
    return {
      volume: {
        min: Math.min(...results.map(k => k.searchVolume)),
        max: Math.max(...results.map(k => k.searchVolume))
      },
      difficulty: {
        min: Math.min(...results.map(k => k.difficulty || 0)),
        max: Math.max(...results.map(k => k.difficulty || 100))
      }
    };
  }, [results]);

  // Initialize ranges when results change
  useMemo(() => {
    if (ranges) {
      setVolumeRange([ranges.volume.min, ranges.volume.max]);
      setDifficultyRange([ranges.difficulty.min, ranges.difficulty.max]);
    }
  }, [ranges]);

  // Filter results
  const filteredResults = useMemo(() => {
    return results.filter(keyword => {
      const volume = keyword.searchVolume;
      const difficulty = keyword.difficulty || 0;
      return (
        volume >= volumeRange[0] &&
        volume <= volumeRange[1] &&
        difficulty >= difficultyRange[0] &&
        difficulty <= difficultyRange[1]
      );
    });
  }, [results, volumeRange, difficultyRange]);

  if (!results.length) return null;

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
            <CardTitle>Filter Keywords</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Search Volume</span>
                <span className="text-sm text-muted-foreground">
                  {volumeRange[0].toLocaleString()} - {volumeRange[1].toLocaleString()}
                </span>
              </div>
              <Slider
                min={ranges?.volume.min || 0}
                max={ranges?.volume.max || 100000}
                step={100}
                value={volumeRange}
                onValueChange={(value: [number, number]) => setVolumeRange(value)}
                className="w-full"
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Difficulty</span>
                <span className="text-sm text-muted-foreground">
                  {difficultyRange[0]} - {difficultyRange[1]}
                </span>
              </div>
              <Slider
                min={ranges?.difficulty.min || 0}
                max={ranges?.difficulty.max || 100}
                step={1}
                value={difficultyRange}
                onValueChange={(value: [number, number]) => setDifficultyRange(value)}
                className="w-full"
              />
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
        </div>
      </ScrollArea>
    </div>
  );
} 