import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { KeywordResearchResult } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface KeywordResultCardProps {
  keyword: KeywordResearchResult;
  isSelected: boolean;
  onToggleSelect: (keyword: string) => void;
}

export function KeywordResultCard({ keyword, isSelected, onToggleSelect }: KeywordResultCardProps) {
  // Helper function to determine difficulty color
  const getDifficultyColor = (difficulty: number | undefined) => {
    if (!difficulty) return "bg-muted text-muted-foreground";
    if (difficulty < 30) return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (difficulty < 60) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    return "bg-red-500/10 text-red-700 dark:text-red-400";
  };

  // Helper function to determine competition color
  const getCompetitionColor = (competition: number) => {
    if (competition < 30) return "text-green-600 dark:text-green-400";
    if (competition < 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card className={cn(
      "w-full transition-all duration-200",
      isSelected && "border-primary/50 bg-primary/5"
    )}>
      <CardContent className="pt-6">
        <div className="flex flex-col gap-4">
          {/* Header row with checkbox and keyword */}
          <div className="flex items-center gap-4">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onToggleSelect(keyword.keyword)}
              id={`select-${keyword.keyword}`}
            />
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{keyword.keyword}</h3>
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Search Volume</p>
              <p className="text-lg font-semibold">{keyword.searchVolume.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Difficulty</p>
              <Badge variant="secondary" className={cn("font-medium", getDifficultyColor(keyword.difficulty))}>
                {keyword.difficulty ?? '-'}
              </Badge>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Competition</p>
              <p className={cn("text-lg font-semibold", getCompetitionColor(keyword.competition))}>
                {keyword.competition}%
              </p>
            </div>
          </div>

          {/* Related keywords */}
          {keyword.relatedKeywords && keyword.relatedKeywords.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Related Keywords</p>
              <div className="flex flex-wrap gap-1">
                {keyword.relatedKeywords.map((related, index) => (
                  <Badge key={index} variant="secondary" className="bg-muted/50">
                    {related}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 