import { Router } from 'express';
import { db } from '@db';
import { keywordLists, savedKeywords } from '@db/schema';
import type { Request, Response } from 'express';
import { eq, and } from 'drizzle-orm';
import { requireAuth } from '../middlewares/authMiddleware';
import ApiResponse from '../lib/api-response';

// Initialize router
const router = Router();

// Test endpoint to check if the router is properly registered
router.get("/test", (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Words router is working!"
  });
});

// Database types for reference
/*
keywordLists: {
  id: number;
  userId: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

savedKeywords: {
  id: number;
  listId: number;
  keyword: string;
  searchVolume: number;
  difficulty: number | null;
  competition: number | null;
  relatedKeywords: any | null;
  createdAt: Date;
}
*/

// Get all word lists for the current user
router.get("/lists", requireAuth, async (req: Request, res: Response) => {
  // Always set content type to application/json
  res.type('application/json');

  try {
    const userId = (req as any).user.id;
    console.log(`[/api/words/lists] Getting lists for user ${userId}`);

    // Query the database for lists
    const lists = await db
      .select()
      .from(keywordLists)
      .where(eq(keywordLists.userId, userId));

    console.log(`[/api/words/lists] Found ${lists.length} lists for user ${userId}`);

    // For each list, get the saved keywords
    const listsWithKeywords = await Promise.all(
      lists.map(async (list) => {
        const keywords = await db
          .select()
          .from(savedKeywords)
          .where(eq(savedKeywords.listId, list.id));

        return {
          ...list,
          savedKeywords: keywords
        };
      })
    );

    console.log("[/api/words/lists] Returning lists for user", userId, ":", listsWithKeywords.length);

    return res.json({
      success: true,
      data: listsWithKeywords
    });
  } catch (error) {
    console.error("Error fetching word lists:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch word lists"
    });
  }
});

// Create a new word list
router.post("/lists", requireAuth, async (req: Request, res: Response) => {
  // Always set content type to application/json
  res.type('application/json');

  try {
    const { name } = req.body;

    if (!name) {
      return ApiResponse.badRequest(res, "List name is required", "MISSING_NAME");
    }

    const [newList] = await db
      .insert(keywordLists)
      .values({
        name,
        userId: (req as any).user.id
      })
      .returning();

    return ApiResponse.created(res, newList, "Word list created successfully");
  } catch (error) {
    console.error("Error creating word list:", error);
    return ApiResponse.serverError(res, "Failed to create word list", "DATABASE_ERROR");
  }
});

// Save words to a list
router.post("/save", requireAuth, async (req: Request, res: Response) => {
  console.log("[/api/words/save] Request received:", {
    body: req.body,
    user: req.user?.id,
    isAuthenticated: req.isAuthenticated(),
    sessionID: req.sessionID
  });
  // Always set content type to application/json
  res.type('application/json');

  try {
    console.log("Received save words request:", JSON.stringify(req.body, null, 2));
    const { listId, newListName, words } = req.body;

    if (!Array.isArray(words)) {
      return ApiResponse.badRequest(res, "Words must be an array", "INVALID_WORDS_FORMAT");
    }

    if (!listId && !newListName) {
      return ApiResponse.badRequest(res, "Either listId or newListName is required", "MISSING_LIST_IDENTIFIER");
    }

    let targetListId = listId;

    // If newListName is provided, create a new list
    if (newListName) {
      console.log("Creating new list with name:", newListName);
      try {
        const [newList] = await db
          .insert(keywordLists)
          .values({
            name: newListName,
            userId: (req as any).user.id
          })
          .returning();

        console.log("New list created:", newList);
        targetListId = newList.id;
      } catch (listError) {
        console.error("Error creating new list:", listError);
        return ApiResponse.serverError(res, "Failed to create new list", "DATABASE_ERROR");
      }
    } else {
      // Verify that the list exists and belongs to the user
      const list = await db
        .select()
        .from(keywordLists)
        .where(and(
          eq(keywordLists.id, targetListId),
          eq(keywordLists.userId, (req as any).user.id)
        ))
        .limit(1);

      if (!list.length) {
        return ApiResponse.notFound(res, "List not found or you don't have permission to access it", "LIST_NOT_FOUND");
      }
    }

    // Prepare values for insertion
    const valuesToInsert = words.map((word) => {
      // Handle both string and object formats
      const keyword = typeof word === 'string' ? word : word.keyword || word.toString();

      return {
        listId: targetListId,
        keyword: keyword,
        searchVolume: 0, // Default value
        difficulty: null,
        competition: null,
        relatedKeywords: null
      };
    });

    console.log("Inserting words:", valuesToInsert);

    // Insert all words
    try {
      const savedWordsList = await db
        .insert(savedKeywords)
        .values(valuesToInsert)
        .returning();

      console.log("Words saved successfully:", savedWordsList.length);
      return ApiResponse.created(res, savedWordsList, "Words saved successfully");
    } catch (insertError) {
      console.error("Error inserting words:", insertError);
      return ApiResponse.serverError(res, "Failed to insert words into database", "DATABASE_ERROR");
    }
  } catch (error) {
    console.error("Error saving words:", error);
    return ApiResponse.serverError(res, "Failed to save words", "INTERNAL_SERVER_ERROR");
  }
});

// Delete a word list
router.delete("/lists/:id", requireAuth, async (req: Request, res: Response) => {
  res.type('json');

  try {
    const listId = parseInt(req.params.id);
    if (isNaN(listId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid list ID"
      });
    }

    // Verify that the list exists and belongs to the user
    const list = await db
      .select()
      .from(keywordLists)
      .where(and(
        eq(keywordLists.id, listId),
        eq(keywordLists.userId, (req as any).user.id)
      ))
      .limit(1);

    if (!list.length) {
      return res.status(404).json({
        success: false,
        error: "List not found or you don't have permission to delete it"
      });
    }

    // Delete the list (cascade will delete saved keywords)
    await db
      .delete(keywordLists)
      .where(eq(keywordLists.id, listId));

    return res.json({
      success: true,
      message: "List deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting word list:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete word list"
    });
  }
});

// Delete a saved word
router.delete("/words/:id", requireAuth, async (req: Request, res: Response) => {
  res.type('json');

  try {
    const wordId = parseInt(req.params.id);
    if (isNaN(wordId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid word ID"
      });
    }

    // Get the word to verify ownership
    const [word] = await db
      .select({
        id: savedKeywords.id,
        listId: savedKeywords.listId
      })
      .from(savedKeywords)
      .where(eq(savedKeywords.id, wordId))
      .limit(1);

    if (!word) {
      return res.status(404).json({
        success: false,
        error: "Word not found"
      });
    }

    // Verify that the word's list belongs to the user
    const [list] = await db
      .select()
      .from(keywordLists)
      .where(and(
        eq(keywordLists.id, word.listId),
        eq(keywordLists.userId, (req as any).user.id)
      ))
      .limit(1);

    if (!list) {
      return res.status(403).json({
        success: false,
        error: "You don't have permission to delete this word"
      });
    }

    // Delete the word
    await db
      .delete(savedKeywords)
      .where(eq(savedKeywords.id, wordId));

    return res.json({
      success: true,
      message: "Word deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting word:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to delete word"
    });
  }
});

// Create a new router for the save endpoint
const saveRouter = Router();

// Save words to a list
saveRouter.post("/", requireAuth, async (req: Request, res: Response) => {
  console.log("[/api/words/save] Request received:", {
    body: req.body,
    user: req.user?.id,
    isAuthenticated: req.isAuthenticated(),
    sessionID: req.sessionID
  });
  res.type('json');

  try {
    console.log("Received save words request:", JSON.stringify(req.body, null, 2));
    const { listId, newListName, words } = req.body;
    const userId = (req as any).user.id;

    if (!Array.isArray(words)) {
      return ApiResponse.badRequest(res, "Words must be an array", "INVALID_WORDS_FORMAT");
    }

    if (!listId && !newListName) {
      return ApiResponse.badRequest(res, "Either listId or newListName is required", "MISSING_LIST_IDENTIFIER");
    }

    let targetListId = listId;

    try {
      // Start a transaction to ensure data consistency
      const result = await db.transaction(async (tx) => {
        // If newListName is provided, create a new list
        if (newListName) {
          console.log("Creating new list with name:", newListName);

          // Create the new list in the database
          const [newList] = await tx
            .insert(keywordLists)
            .values({
              userId,
              name: newListName,
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          targetListId = newList.id;

          console.log("New list created:", newList);
        } else {
          // Find the existing list in the database
          const [existingList] = await tx
            .select()
            .from(keywordLists)
            .where(
              and(
                eq(keywordLists.id, targetListId),
                eq(keywordLists.userId, userId)
              )
            );

          if (!existingList) {
            throw new Error("List not found or does not belong to user");
          }

          // List exists and belongs to the user
        }

        // Save words to the database
        const savedKeywordsData = await tx
          .insert(savedKeywords)
          .values(
            words.map(word => ({
              listId: targetListId,
              keyword: typeof word === 'string' ? word : word.keyword || word.toString(),
              searchVolume: 0,
              createdAt: new Date()
            }))
          )
          .returning();

        console.log(`Words saved successfully: ${savedKeywordsData.length}`);

        return savedKeywordsData;
      });

      return ApiResponse.created(res, result, "Words saved successfully");
    } catch (error) {
      console.error("Transaction error:", error);
      if (error instanceof Error && error.message === "List not found or does not belong to user") {
        return ApiResponse.notFound(res, "List not found or does not belong to user", "LIST_NOT_FOUND");
      }
      return ApiResponse.serverError(res, "Failed to save words", "DATABASE_ERROR");
    }
  } catch (error) {
    console.error("Error in save words endpoint:", error);
    return ApiResponse.serverError(res, "Failed to save words", "INTERNAL_SERVER_ERROR");
  }
});

// Register the save endpoint
router.use('/save', saveRouter);

export const wordRoutes = router;