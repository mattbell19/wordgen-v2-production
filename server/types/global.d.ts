// Global type declarations
declare global {
  namespace NodeJS {
    interface Global {
      savedLists: Array<{
        id: number;
        userId: number;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        savedKeywords: Array<{
          id: number;
          listId: number;
          keyword: string;
          searchVolume: number;
          difficulty: number | null;
          competition: number | null;
          relatedKeywords: string[] | null;
          createdAt: Date;
        }>;
      }>;
    }
  }
}

export {};
