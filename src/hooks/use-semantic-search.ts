"use client";

import { useState, useEffect } from "react";
import { DBFile } from "@/types/file.types";

export interface UseSemanticSearchReturn {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  loading: boolean;
  results: DBFile[];
}

export function useSemanticSearch(initialQuery = "", debounceMs = 500): UseSemanticSearchReturn {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DBFile[]>([]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/files/search?q=${encodeURIComponent(searchTerm)}`);
        const json = await res.json();
        if (json.success && json.data && Array.isArray(json.data.files)) {
          setResults(json.data.files);
        } else {
          setResults([]);
        }
      } catch (err) {
        console.error("Semantic search hook error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);

  return {
    searchTerm,
    setSearchTerm,
    loading,
    results,
  };
}
