import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useGSC } from '@/hooks/use-gsc';
import { LoadingState } from '@/components/ui/loading-state';
import { AlertCircle, CheckCircle2, ExternalLink } from 'lucide-react';

/**
 * Component for connecting to Google Search Console
 */
export function ConnectGSC() {
  const { isConnected, isLoading, getAuthUrl, disconnect } = useGSC();

  const handleConnect = async () => {
    // Directly open the Google authorization URL
    window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?access_type=offline&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fwebmasters.readonly%20profile%20email&prompt=consent&state=eyJ1c2VySWQiOjF9&response_type=code&client_id=889103348895-90on69fjcf586k9hjs1442o9i399lsm9.apps.googleusercontent.com&redirect_uri=http%3A%2F%2Flocalhost%3A3001%2Fapi%2Fgsc%2Fcallback';
  };

  const handleDisconnect = () => {
    disconnect.mutate();
  };

  return (
    <LoadingState isLoading={isLoading} loadingText="Checking connection status...">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isConnected ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                Connected to Google Search Console
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-amber-500" />
                Connect to Google Search Console
              </>
            )}
          </CardTitle>
          <CardDescription>
            {isConnected
              ? 'Your account is connected to Google Search Console. You can now view search performance data.'
              : 'Connect your Google Search Console account to view search performance data for your websites.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected ? (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                You can disconnect your Google Search Console account at any time. This will remove access to your search performance data.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm text-muted-foreground">
                Connecting to Google Search Console allows WordGen to access your search performance data, including:
              </p>
              <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                <li>Search queries that bring visitors to your site</li>
                <li>Click-through rates and positions in search results</li>
                <li>Top-performing pages and content</li>
                <li>Search trends and opportunities for optimization</li>
              </ul>
              <p className="text-sm text-muted-foreground">
                WordGen only requests read-only access to your search data and does not modify any settings in your Google Search Console account.
              </p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          {isConnected ? (
            <>
              <Button variant="outline" onClick={handleDisconnect} disabled={disconnect.isLoading}>
                {disconnect.isLoading ? 'Disconnecting...' : 'Disconnect'}
              </Button>
              <Button variant="default" asChild>
                <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  Open Search Console
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect}>
              Connect to Google Search Console
            </Button>
          )}
        </CardFooter>
      </Card>
    </LoadingState>
  );
}
