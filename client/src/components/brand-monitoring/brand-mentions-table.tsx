import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Search, Filter, Download, ExternalLink } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface BrandMention {
  id: number;
  query: string;
  response: string;
  platform: string;
  brandMentioned: string;
  mentionType: 'direct' | 'indirect' | 'competitive';
  rankingPosition: number | null;
  sentiment: 'positive' | 'neutral' | 'negative';
  confidenceScore: number;
  contextSnippet: string;
  createdAt: string;
}

interface BrandMentionsTableProps {
  mentions: BrandMention[];
}

export const BrandMentionsTable: React.FC<BrandMentionsTableProps> = ({ mentions }) => {
  const [selectedMention, setSelectedMention] = useState<BrandMention | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [sentimentFilter, setSentimentFilter] = useState<string>('all');
  const [mentionTypeFilter, setMentionTypeFilter] = useState<string>('all');

  const filteredMentions = mentions.filter(mention => {
    const matchesSearch = searchTerm === '' || 
      mention.query.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mention.response.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mention.brandMentioned.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPlatform = platformFilter === 'all' || mention.platform === platformFilter;
    const matchesSentiment = sentimentFilter === 'all' || mention.sentiment === sentimentFilter;
    const matchesMentionType = mentionTypeFilter === 'all' || mention.mentionType === mentionTypeFilter;

    return matchesSearch && matchesPlatform && matchesSentiment && matchesMentionType;
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return 'bg-green-100 text-green-800';
      case 'negative':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMentionTypeColor = (type: string) => {
    switch (type) {
      case 'direct':
        return 'bg-blue-100 text-blue-800';
      case 'competitive':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlatformIcon = (platform: string) => {
    // You can add platform-specific icons here
    return platform.charAt(0).toUpperCase();
  };

  const exportMentions = () => {
    const csvContent = [
      ['Query', 'Platform', 'Brand Mentioned', 'Mention Type', 'Ranking Position', 'Sentiment', 'Confidence Score', 'Created At'],
      ...filteredMentions.map(mention => [
        mention.query,
        mention.platform,
        mention.brandMentioned,
        mention.mentionType,
        mention.rankingPosition?.toString() || 'N/A',
        mention.sentiment,
        mention.confidenceScore.toString(),
        new Date(mention.createdAt).toLocaleString()
      ])
    ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brand-mentions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const uniquePlatforms = Array.from(new Set(mentions.map(m => m.platform)));

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Brand Mentions ({filteredMentions.length})
            </CardTitle>
            <Button variant="outline" size="sm" onClick={exportMentions}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mt-4">
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder="Search mentions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={platformFilter} onValueChange={setPlatformFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Platforms</SelectItem>
                {uniquePlatforms.map(platform => (
                  <SelectItem key={platform} value={platform}>
                    {platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sentimentFilter} onValueChange={setSentimentFilter}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Sentiment" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sentiment</SelectItem>
                <SelectItem value="positive">Positive</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
                <SelectItem value="negative">Negative</SelectItem>
              </SelectContent>
            </Select>

            <Select value={mentionTypeFilter} onValueChange={setMentionTypeFilter}>
              <SelectTrigger className="w-[130px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="direct">Direct</SelectItem>
                <SelectItem value="indirect">Indirect</SelectItem>
                <SelectItem value="competitive">Competitive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead>Platform</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Position</TableHead>
                  <TableHead>Sentiment</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMentions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      {mentions.length === 0 ? 'No mentions found' : 'No mentions match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMentions.map((mention) => (
                    <TableRow key={mention.id}>
                      <TableCell>
                        <div className="max-w-[200px] truncate" title={mention.query}>
                          {mention.query}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                            {getPlatformIcon(mention.platform)}
                          </div>
                          <span className="capitalize">{mention.platform}</span>
                        </div>
                      </TableCell>
                      <TableCell>{mention.brandMentioned}</TableCell>
                      <TableCell>
                        <Badge className={getMentionTypeColor(mention.mentionType)}>
                          {mention.mentionType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {mention.rankingPosition ? (
                          <Badge variant="outline">#{mention.rankingPosition}</Badge>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getSentimentColor(mention.sentiment)}>
                          {mention.sentiment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="text-sm">{mention.confidenceScore}%</span>
                          <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 transition-all"
                              style={{ width: `${mention.confidenceScore}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(mention.createdAt).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(mention.createdAt).toLocaleTimeString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedMention(mention)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mention Detail Dialog */}
      <Dialog open={!!selectedMention} onOpenChange={() => setSelectedMention(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mention Details</DialogTitle>
          </DialogHeader>
          
          {selectedMention && (
            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Platform</label>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium">
                      {getPlatformIcon(selectedMention.platform)}
                    </div>
                    <span className="capitalize">{selectedMention.platform}</span>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Sentiment</label>
                  <div className="mt-1">
                    <Badge className={getSentimentColor(selectedMention.sentiment)}>
                      {selectedMention.sentiment}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Position</label>
                  <div className="mt-1">
                    {selectedMention.rankingPosition ? (
                      <Badge variant="outline">#{selectedMention.rankingPosition}</Badge>
                    ) : (
                      <span className="text-gray-400">Not ranked</span>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Confidence</label>
                  <div className="mt-1 text-sm font-medium">
                    {selectedMention.confidenceScore}%
                  </div>
                </div>
              </div>

              {/* Query */}
              <div>
                <label className="text-sm font-medium text-gray-600">Query</label>
                <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm">{selectedMention.query}</p>
                </div>
              </div>

              {/* Response */}
              <div>
                <label className="text-sm font-medium text-gray-600">Full Response</label>
                <div className="mt-1 p-4 bg-gray-50 rounded-lg max-h-60 overflow-y-auto">
                  <p className="text-sm whitespace-pre-wrap">{selectedMention.response}</p>
                </div>
              </div>

              {/* Context Snippet */}
              {selectedMention.contextSnippet && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Context Snippet</label>
                  <div className="mt-1 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm">{selectedMention.contextSnippet}</p>
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="text-sm font-medium text-gray-600">Brand Mentioned</label>
                  <p className="text-sm mt-1">{selectedMention.brandMentioned}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Mention Type</label>
                  <div className="mt-1">
                    <Badge className={getMentionTypeColor(selectedMention.mentionType)}>
                      {selectedMention.mentionType}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Created</label>
                  <p className="text-sm mt-1">
                    {new Date(selectedMention.createdAt).toLocaleString()}
                  </p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Mention ID</label>
                  <p className="text-sm mt-1 font-mono">{selectedMention.id}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};