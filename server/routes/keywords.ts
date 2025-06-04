import { Router } from "express";
import type { Response, Request } from "express";
import { db } from "@db";
import { keywordLists, savedKeywords } from "@db/schema";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../middleware/authMiddleware";
import { researchKeywords } from "../services/keyword.service";
import type { KeywordResearchResult } from "@/lib/types";
import axios from 'axios';
import { getUserIdsForContext, getActiveContext } from '../utils/team-context';

const router = Router();

// Research keywords endpoint
router.post("/research", requireAuth, async (req: Request, res: Response) => {
  // Force JSON response type
  res.type('json');

  try {
    console.log("[Keyword API] Received request:", req.body);

    const { search_question, search_country } = req.body;

    if (!search_question?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Search question is required"
      });
    }

    console.log("[Keyword API] Starting research for:", search_question);

    const keywords = await researchKeywords({
      search_question: search_question.trim(),
      search_country: search_country || 'en-US'
    });

    console.log("[Keyword API] Found keywords:", keywords.length);
    if (keywords.length > 0) {
      console.log("[Keyword API] Sample keyword data:", keywords[0]);
    }

    return res.status(200).json({
      success: true,
      data: keywords
    });

  } catch (error: any) {
    console.error('[Keyword API] Error:', error);
    console.error('[Keyword API] Error stack:', error.stack);

    // Enhanced error response
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to research keywords",
      error: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        details: error.response?.data
      } : undefined
    });
  }
});

// Get all keyword lists for the current user or team
router.get("/lists", requireAuth, async (req: Request, res: Response) => {
  res.type('json');

  try {
    // Get user IDs for the current context (personal or team)
    const userIds = await getUserIdsForContext(req);
    console.log('Fetching keyword lists for context:', { userIds });

    const lists = await db
      .select({
        id: keywordLists.id,
        name: keywordLists.name,
        userId: keywordLists.userId,
        createdAt: keywordLists.createdAt,
        updatedAt: keywordLists.updatedAt,
        savedKeywords: savedKeywords
      })
      .from(keywordLists)
      .leftJoin(savedKeywords, eq(savedKeywords.listId, keywordLists.id))
      .where(inArray(keywordLists.userId, userIds));

    // Group saved keywords by list
    const groupedLists = lists.reduce((acc: any[], curr) => {
      const existingList = acc.find(l => l.id === curr.id);
      if (existingList) {
        if (curr.savedKeywords) {
          existingList.savedKeywords.push(curr.savedKeywords);
        }
      } else {
        acc.push({
          id: curr.id,
          name: curr.name,
          userId: curr.userId,
          createdAt: curr.createdAt,
          updatedAt: curr.updatedAt,
          savedKeywords: curr.savedKeywords ? [curr.savedKeywords] : []
        });
      }
      return acc;
    }, []);

    return res.json(groupedLists);
  } catch (error) {
    console.error("Error fetching keyword lists:", error);
    return res.status(500).json({ error: "Failed to fetch keyword lists" });
  }
});

// Save keywords to list
router.post("/save", requireAuth, async (req: Request, res: Response) => {
  res.type('json');

  try {
    const { listId, newListName, keywords } = req.body;
    const userId = (req as any).user.id;

    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: "Keywords must be an array" });
    }

    let targetListId = listId;

    // If newListName is provided, create a new list
    if (newListName) {
      // Get active context (personal or team)
      const { teamId } = await getActiveContext(req);
      console.log('Creating new keyword list in context:', { userId, teamId });

      const [newList] = await db
        .insert(keywordLists)
        .values({
          name: newListName,
          userId: userId // Always use the current user's ID as the creator
        })
        .returning();

      targetListId = newList.id;
    } else if (listId) {
      // Verify the user has access to the list
      const userIds = await getUserIdsForContext(req);
      const list = await db.query.keywordLists.findFirst({
        where: eq(keywordLists.id, listId),
      });

      if (!list || !userIds.includes(list.userId)) {
        return res.status(403).json({ error: "You don't have access to this list" });
      }
    }

    // Insert all keywords
    const savedKeywordsList = await db
      .insert(savedKeywords)
      .values(
        keywords.map(k => ({
          listId: targetListId,
          keyword: k.keyword,
          searchVolume: k.searchVolume,
          difficulty: k.difficulty,
          competition: k.competition,
          relatedKeywords: k.relatedKeywords
        }))
      )
      .returning();

    return res.json(savedKeywordsList);
  } catch (error) {
    console.error("Error saving keywords:", error);
    return res.status(500).json({ error: "Failed to save keywords" });
  }
});

// Test DataForSEO credentials endpoint
router.get("/test-credentials", async (req: Request, res: Response) => {
  try {
    const auth = process.env.DATAFORSEO_LOGIN && process.env.DATAFORSEO_PASSWORD
      ? Buffer.from(`${process.env.DATAFORSEO_LOGIN}:${process.env.DATAFORSEO_PASSWORD}`).toString('base64')
      : null;

    if (!auth) {
      return res.status(500).json({
        success: false,
        message: "DataForSEO credentials are not configured"
      });
    }

    // Make a simple test request to DataForSEO
    const response = await axios({
      method: 'GET',
      url: 'https://api.dataforseo.com/v3/merchant/google/locations',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
      },
      validateStatus: null
    });

    // Log the full response for debugging
    console.log('[Test Credentials] Response:', {
      status: response.status,
      statusText: response.statusText,
      data: response.data
    });

    return res.json({
      success: response.status === 200,
      status: response.status,
      message: response.data?.status_message || response.statusText,
      data: response.data
    });

  } catch (error: any) {
    console.error('[Test Credentials] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to test credentials",
      error: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        details: error.response?.data
      } : undefined
    });
  }
});

// RapidAPI Keyword Research endpoint
router.get("/rapid-research", requireAuth, async (req: Request, res: Response) => {
  res.type('json');

  try {
    const { keyword, location = 'US', lang = 'en' } = req.query;

    if (!keyword) {
      return res.status(400).json({
        success: false,
        message: "Keyword parameter is required"
      });
    }

    const options = {
      method: 'GET',
      url: 'https://google-keyword-insight1.p.rapidapi.com/keysuggest/',
      params: {
        keyword: keyword,
        location: location,
        lang: lang
      },
      headers: {
        'x-rapidapi-key': process.env.RAPIDAPI_KEY || '0e2bac29a5msh9ded3a761e93b89p1518cajsn5ceddceef03a',
        'x-rapidapi-host': 'google-keyword-insight1.p.rapidapi.com'
      }
    };

    const response = await axios.request(options);

    return res.status(200).json({
      success: true,
      data: response.data
    });

  } catch (error: any) {
    console.error('[RapidAPI Keyword Research] Error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch keyword suggestions",
      error: process.env.NODE_ENV === 'development' ? {
        stack: error.stack,
        details: error.response?.data
      } : undefined
    });
  }
});

export const keywordRoutes = router;