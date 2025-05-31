import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { people_v1 } from 'googleapis';
import { db } from '../../db';
import { gscConnections, gscSites, gscPerformanceCache, gscKeywordTracking } from '../../db/schema';
import { googleApiConfig } from '../config/google-api';
import { eq, and, lt, gte, desc } from 'drizzle-orm';

/**
 * Google Search Console Service
 * Handles interactions with the Google Search Console API
 */
export class GSCService {
  private oauth2Client: OAuth2Client;

  constructor() {
    console.log('[GSC] Initializing GSC service with config:', {
      clientId: googleApiConfig.clientId ? 'Set' : 'Not set',
      clientSecret: googleApiConfig.clientSecret ? 'Set' : 'Not set',
      redirectUri: googleApiConfig.redirectUri
    });

    this.oauth2Client = new google.auth.OAuth2(
      googleApiConfig.clientId,
      googleApiConfig.clientSecret,
      googleApiConfig.redirectUri
    );
  }

  /**
   * Generate authorization URL for Google OAuth
   */
  generateAuthUrl(userId: number): string {
    // Create a state parameter with the user ID to retrieve it in the callback
    const state = Buffer.from(JSON.stringify({ userId })).toString('base64');

    console.log(`[GSC] Generating auth URL for user ${userId} with state: ${state}`);

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: googleApiConfig.scopes,
      prompt: 'consent', // Force consent screen to ensure we get a refresh token
      state
    });

    console.log(`[GSC] Generated auth URL: ${authUrl}`);
    return authUrl;
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expiry_date: number;
    id_token?: string;
  }> {
    const { tokens } = await this.oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
      throw new Error('Invalid tokens received from Google');
    }

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
      id_token: tokens.id_token
    };
  }

  /**
   * Get user info from access token
   */
  async getUserInfo(accessToken: string): Promise<{
    email: string;
    picture: string;
  }> {
    try {
      // Set the access token
      this.oauth2Client.setCredentials({
        access_token: accessToken
      });

      // Use the People API to get user info
      const people = google.people({ version: 'v1', auth: this.oauth2Client });
      const userInfo = await people.people.get({
        resourceName: 'people/me',
        personFields: 'emailAddresses,photos'
      });

      const email = userInfo.data.emailAddresses?.[0]?.value || '';
      const picture = userInfo.data.photos?.[0]?.url || '';

      if (!email) {
        throw new Error('Could not retrieve email from Google API');
      }

      return {
        email,
        picture
      };
    } catch (error) {
      console.error('Error getting user info:', error);
      // Return default values if there's an error
      return {
        email: 'unknown@example.com',
        picture: ''
      };
    }
  }

  /**
   * Save Google OAuth tokens for a user
   */
  async saveUserTokens(
    userId: number,
    accessToken: string,
    refreshToken: string,
    expiryDate: number,
    email?: string,
    profilePicture?: string
  ): Promise<void> {
    // Check if user already has a connection
    const existingConnection = await db
      .select()
      .from(gscConnections)
      .where(eq(gscConnections.userId, userId));

    const expiresAt = new Date(expiryDate);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(gscConnections)
        .set({
          accessToken,
          refreshToken,
          expiresAt,
          email: email || existingConnection[0].email,
          profilePicture: profilePicture || existingConnection[0].profilePicture,
          updatedAt: new Date()
        })
        .where(eq(gscConnections.userId, userId));
    } else {
      // Create new connection
      await db
        .insert(gscConnections)
        .values({
          userId,
          accessToken,
          refreshToken,
          expiresAt,
          email,
          profilePicture
        });
    }
  }

  /**
   * Get OAuth client for a user
   */
  async getOAuthClientForUser(userId: number): Promise<OAuth2Client> {
    const connections = await db
      .select()
      .from(gscConnections)
      .where(eq(gscConnections.userId, userId));

    if (connections.length === 0) {
      throw new Error('User has no Google Search Console connection');
    }

    const connection = connections[0];

    // Check if token is expired or about to expire (within 10 minutes)
    const expiryDate = connection.expiresAt?.getTime() || 0;
    const now = Date.now();
    const tenMinutes = 10 * 60 * 1000;
    const isExpired = expiryDate - now < tenMinutes;

    try {
      if (isExpired && connection.refreshToken) {
        console.log(`Token for user ${userId} is expired or about to expire, refreshing...`);

        // Set credentials with refresh token only
        this.oauth2Client.setCredentials({
          refresh_token: connection.refreshToken
        });

        // Refresh the token
        const { credentials } = await this.oauth2Client.refreshAccessToken();

        // Update tokens in database
        await db
          .update(gscConnections)
          .set({
            accessToken: credentials.access_token || connection.accessToken,
            refreshToken: credentials.refresh_token || connection.refreshToken,
            expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date) : new Date(now + 3600 * 1000), // Default to 1 hour if no expiry
            updatedAt: new Date()
          })
          .where(eq(gscConnections.userId, userId));

        // Update OAuth client with new credentials
        this.oauth2Client.setCredentials(credentials);
        console.log(`Token refreshed successfully for user ${userId}`);
      } else {
        // Set credentials with existing tokens
        this.oauth2Client.setCredentials({
          access_token: connection.accessToken,
          refresh_token: connection.refreshToken,
          expiry_date: expiryDate
        });
      }
    } catch (error) {
      console.error(`Error refreshing token for user ${userId}:`, error);

      // Set credentials with existing tokens as fallback
      this.oauth2Client.setCredentials({
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
        expiry_date: expiryDate
      });
    }

    return this.oauth2Client;
  }

  /**
   * Get list of sites for a user
   */
  async getSitesForUser(userId: number): Promise<any[]> {
    try {
      const oauth2Client = await this.getOAuthClientForUser(userId);
      const searchConsole = google.webmasters({ version: 'v3', auth: oauth2Client });

      // Get sites from Google Search Console
      const response = await searchConsole.sites.list();
      const sites = response.data.siteEntry || [];

      // Save sites to database
      for (const site of sites) {
        if (!site.siteUrl) continue;

        const existingSites = await db
          .select()
          .from(gscSites)
          .where(
            and(
              eq(gscSites.userId, userId),
              eq(gscSites.siteUrl, site.siteUrl)
            )
          );

        if (existingSites.length === 0) {
          // Site doesn't exist, create it
          await db
            .insert(gscSites)
            .values({
              userId,
              siteUrl: site.siteUrl,
              permissionLevel: site.permissionLevel || 'OWNER',
              isDefault: false
            });
        } else {
          // Site exists, update permission level
          await db
            .update(gscSites)
            .set({
              permissionLevel: site.permissionLevel || existingSites[0].permissionLevel,
              updatedAt: new Date()
            })
            .where(
              and(
                eq(gscSites.userId, userId),
                eq(gscSites.siteUrl, site.siteUrl)
              )
            );
        }
      }

      // Get sites from database (including isDefault flag)
      const dbSites = await db
        .select()
        .from(gscSites)
        .where(eq(gscSites.userId, userId));

      // If no default site is set and we have sites, set the first one as default
      if (dbSites.length > 0 && !dbSites.some(site => site.isDefault)) {
        await db
          .update(gscSites)
          .set({ isDefault: true })
          .where(eq(gscSites.id, dbSites[0].id));

        dbSites[0].isDefault = true;
      }

      return dbSites;
    } catch (error) {
      console.error('Error getting sites for user:', error);
      throw error;
    }
  }

  /**
   * Set default site for a user
   */
  async setDefaultSite(userId: number, siteId: number, siteUrl?: string): Promise<void> {
    // First, unset default for all user's sites
    await db
      .update(gscSites)
      .set({ isDefault: false })
      .where(eq(gscSites.userId, userId));

    // Then set the specified site as default
    if (siteId) {
      await db
        .update(gscSites)
        .set({ isDefault: true })
        .where(
          and(
            eq(gscSites.userId, userId),
            eq(gscSites.id, siteId)
          )
        );
    } else if (siteUrl) {
      await db
        .update(gscSites)
        .set({ isDefault: true })
        .where(
          and(
            eq(gscSites.userId, userId),
            eq(gscSites.siteUrl, siteUrl)
          )
        );
    } else {
      throw new Error('Either siteId or siteUrl must be provided');
    }
  }

  /**
   * Get default site for a user
   */
  async getDefaultSite(userId: number): Promise<any> {
    const sites = await db
      .select()
      .from(gscSites)
      .where(
        and(
          eq(gscSites.userId, userId),
          eq(gscSites.isDefault, true)
        )
      );

    if (sites.length === 0) {
      // No default site, try to get any site
      const allSites = await db
        .select()
        .from(gscSites)
        .where(eq(gscSites.userId, userId));

      if (allSites.length === 0) {
        throw new Error('User has no sites in Google Search Console');
      }

      // Set the first site as default
      await this.setDefaultSite(userId, allSites[0].id);

      return allSites[0];
    }

    return sites[0];
  }

  /**
   * Get search performance data for a site
   */
  async getSearchPerformance(
    userId: number,
    siteId?: number,
    startDate?: string,
    endDate?: string,
    dimensions: string[] = ['query'],
    rowLimit: number = 1000
  ): Promise<any> {
    try {
      // Get site to query
      let site;
      if (siteId) {
        const sites = await db
          .select()
          .from(gscSites)
          .where(
            and(
              eq(gscSites.userId, userId),
              eq(gscSites.id, siteId)
            )
          );

        if (sites.length === 0) {
          throw new Error('Site not found');
        }

        site = sites[0];
      } else {
        site = await this.getDefaultSite(userId);
      }

      // Set date range
      const dateRange = {
        startDate: startDate || googleApiConfig.searchConsole.defaultDateRange.startDate,
        endDate: endDate || googleApiConfig.searchConsole.defaultDateRange.endDate
      };

      // Check cache first
      const cacheKey = JSON.stringify({
        siteUrl: site.siteUrl,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        dimensions,
        rowLimit
      });

      const cachedData = await db
        .select()
        .from(gscPerformanceCache)
        .where(
          and(
            eq(gscPerformanceCache.siteId, site.id),
            eq(gscPerformanceCache.queryType, 'performance'),
            eq(gscPerformanceCache.queryParams, cacheKey),
            lt(gscPerformanceCache.expiresAt, new Date())
          )
        )
        .orderBy(desc(gscPerformanceCache.createdAt))
        .limit(1);

      if (cachedData.length > 0) {
        return JSON.parse(cachedData[0].responseData);
      }

      // No cache or expired, fetch from API
      const oauth2Client = await this.getOAuthClientForUser(userId);
      const searchConsole = google.webmasters({ version: 'v3', auth: oauth2Client });

      const response = await searchConsole.searchanalytics.query({
        siteUrl: site.siteUrl,
        requestBody: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          dimensions: dimensions,
          rowLimit: rowLimit
        }
      });

      // Cache the response
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + googleApiConfig.searchConsole.cacheTtl);

      await db
        .insert(gscPerformanceCache)
        .values({
          siteId: site.id,
          queryType: 'performance',
          queryParams: cacheKey,
          responseData: JSON.stringify(response.data),
          expiresAt
        });

      return response.data;
    } catch (error) {
      console.error('Error getting search performance:', error);
      throw error;
    }
  }

  /**
   * Get top keywords for a site
   */
  async getTopKeywords(
    userId: number,
    siteId?: number,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<any> {
    const performanceData = await this.getSearchPerformance(
      userId,
      siteId,
      startDate,
      endDate,
      ['query'],
      limit
    );

    return performanceData.rows || [];
  }

  /**
   * Get top pages for a site
   */
  async getTopPages(
    userId: number,
    siteId?: number,
    startDate?: string,
    endDate?: string,
    limit: number = 100
  ): Promise<any> {
    const performanceData = await this.getSearchPerformance(
      userId,
      siteId,
      startDate,
      endDate,
      ['page'],
      limit
    );

    return performanceData.rows || [];
  }

  /**
   * Check if a user has connected to Google Search Console
   */
  async isUserConnected(userId: number): Promise<boolean> {
    const connections = await db
      .select()
      .from(gscConnections)
      .where(eq(gscConnections.userId, userId));

    return connections.length > 0;
  }

  /**
   * Disconnect a user from Google Search Console
   */
  async disconnectUser(userId: number): Promise<void> {
    await db
      .delete(gscConnections)
      .where(eq(gscConnections.userId, userId));

    // Also delete all sites and cached data
    await db
      .delete(gscSites)
      .where(eq(gscSites.userId, userId));
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<void> {
    try {
      const now = new Date();

      // Delete expired performance cache entries
      const result = await db
        .delete(gscPerformanceCache)
        .where(lt(gscPerformanceCache.expiresAt, now));

      console.log(`Cleaned up ${result.rowCount || 0} expired GSC cache entries`);
    } catch (error) {
      console.error('Error cleaning up expired GSC cache:', error);
    }
  }

  /**
   * Get site by ID
   */
  async getSiteById(siteId: number): Promise<any> {
    const sites = await db
      .select()
      .from(gscSites)
      .where(eq(gscSites.id, siteId));

    if (sites.length === 0) {
      return null;
    }

    return sites[0];
  }

  /**
   * Get search analytics data
   */
  async getSearchAnalyticsData(
    userId: number,
    siteUrl: string,
    startDate: string,
    endDate: string,
    dimensions: string[] = ['date'],
    rowLimit: number = 1000
  ): Promise<any> {
    try {
      // Check cache first
      const cacheKey = JSON.stringify({
        siteUrl,
        startDate,
        endDate,
        dimensions,
        rowLimit
      });

      // Get site ID
      const sites = await db
        .select()
        .from(gscSites)
        .where(
          and(
            eq(gscSites.userId, userId),
            eq(gscSites.siteUrl, siteUrl)
          )
        );

      if (sites.length === 0) {
        throw new Error('Site not found');
      }

      const siteId = sites[0].id;

      // Check if we have a valid cache entry
      const now = new Date();
      const cachedData = await db
        .select()
        .from(gscPerformanceCache)
        .where(
          and(
            eq(gscPerformanceCache.siteId, siteId),
            eq(gscPerformanceCache.queryType, 'analytics'),
            eq(gscPerformanceCache.queryParams, cacheKey),
            gte(gscPerformanceCache.expiresAt, now) // Make sure it's not expired
          )
        )
        .orderBy(desc(gscPerformanceCache.createdAt))
        .limit(1);

      if (cachedData.length > 0) {
        console.log('Using cached GSC data for', siteUrl, 'expires at', cachedData[0].expiresAt);
        return JSON.parse(cachedData[0].responseData);
      }

      console.log('Fetching fresh GSC data for', siteUrl);

      // No cache or expired, fetch from API
      const oauth2Client = await this.getOAuthClientForUser(userId);
      const searchConsole = google.webmasters({ version: 'v3', auth: oauth2Client });

      const response = await searchConsole.searchanalytics.query({
        siteUrl: siteUrl,
        requestBody: {
          startDate: startDate,
          endDate: endDate,
          dimensions: dimensions,
          rowLimit: rowLimit
        }
      });

      // Cache the response
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + googleApiConfig.searchConsole.cacheTtl);

      // Delete any old cache entries for this query
      await db
        .delete(gscPerformanceCache)
        .where(
          and(
            eq(gscPerformanceCache.siteId, siteId),
            eq(gscPerformanceCache.queryType, 'analytics'),
            eq(gscPerformanceCache.queryParams, cacheKey)
          )
        );

      // Insert new cache entry
      await db
        .insert(gscPerformanceCache)
        .values({
          siteId: siteId,
          queryType: 'analytics',
          queryParams: cacheKey,
          responseData: JSON.stringify(response.data),
          expiresAt,
          createdAt: now
        });

      return response.data;
    } catch (error) {
      console.error('Error getting search analytics data:', error);
      // Return empty data structure instead of throwing
      return {
        rows: [],
        responseAggregationType: 'byProperty',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const gscService = new GSCService();
