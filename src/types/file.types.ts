/**
 * Shared type definitions for files and semantic search operations.
 */

export interface DBFile {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  isDeleted?: boolean;
  isShared?: boolean;
  caption?: string;
  createdAt: string;
  similarity?: number;
}

export interface SemanticSearchResponse {
  threshold: number;
  files: DBFile[];
}
