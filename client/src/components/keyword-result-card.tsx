import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { KeywordResearchResult } from "@/lib/types";

interface KeywordResultCardProps {
  keyword: KeywordResearchResult;
  isSelected: boolean;
  onToggleSelect: (keyword: string) => void;
}

export function KeywordResultCard({ keyword, isSelected, onToggleSelect }: KeywordResultCardProps) {
  return (
    <Card className="w-full">
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
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Search Volume</p>
              <p className="font-medium">{keyword.searchVolume.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Difficulty</p>
              <p className="font-medium">{keyword.difficulty ?? '-'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Competition</p>
              <p className="font-medium">{keyword.competition}%</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 