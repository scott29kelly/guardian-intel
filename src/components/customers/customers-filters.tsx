"use client";

import { RefObject } from "react";
import { Search, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { statusOptions, stageOptions, sortOptions, ViewMode } from "./types";

interface CustomersFiltersProps {
  searchInputRef: RefObject<HTMLInputElement | null>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  stageFilter: string;
  setStageFilter: (stage: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  sortOrder: "asc" | "desc";
  setSortOrder: (order: "asc" | "desc") => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  customerCount: number;
}

export function CustomersFilters({
  searchInputRef,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  stageFilter,
  setStageFilter,
  sortBy,
  setSortBy,
  sortOrder,
  setSortOrder,
  viewMode,
  setViewMode,
  customerCount,
}: CustomersFiltersProps) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search by name, email, phone, or address... (press /)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent-primary/50 focus:ring-1 focus:ring-accent-primary/25 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
          >
            {stageOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-4 py-2.5 bg-surface-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent-primary/50 cursor-pointer"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                Sort: {option.label}
              </option>
            ))}
          </select>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
          >
            {sortOrder === "desc" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </Button>

          {/* View Mode Toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("cards")}
              className={`px-3 py-2 text-sm transition-all ${
                viewMode === "cards"
                  ? "bg-accent-primary/20 text-accent-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Cards
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-2 text-sm transition-all ${
                viewMode === "table"
                  ? "bg-accent-primary/20 text-accent-primary"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Table
            </button>
          </div>
        </div>

        {/* Active Filters */}
        <div className="flex items-center gap-2 mt-3">
          <span className="text-sm text-text-muted">
            {customerCount} customers
          </span>
          {(statusFilter !== "all" || stageFilter !== "all" || searchQuery) && (
            <>
              <span className="text-border">|</span>
              {searchQuery && (
                <Badge variant="secondary" className="text-xs">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery("")}
                    className="ml-1 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {statusFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Status: {statusFilter}
                  <button
                    onClick={() => setStatusFilter("all")}
                    className="ml-1 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {stageFilter !== "all" && (
                <Badge variant="secondary" className="text-xs">
                  Stage: {stageFilter}
                  <button
                    onClick={() => setStageFilter("all")}
                    className="ml-1 hover:text-text-primary"
                  >
                    ×
                  </button>
                </Badge>
              )}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
