/**
 * Gamification Leaderboard API
 * 
 * GET - Fetch team leaderboard
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { LeaderboardEntry } from "@/lib/gamification/types";

// Mock leaderboard data
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: "user-1", name: "Marcus Johnson", score: 127500, change: 0, level: 12 },
  { rank: 2, userId: "user-2", name: "Sarah Mitchell", score: 98200, change: 1, level: 10 },
  { rank: 3, userId: "user-3", name: "James Wilson", score: 87650, change: -1, level: 9 },
  { rank: 4, userId: "user-4", name: "Emily Chen", score: 76400, change: 2, level: 8 },
  { rank: 5, userId: "user-5", name: "David Park", score: 65200, change: 0, level: 7 },
  { rank: 6, userId: "user-6", name: "Lisa Rodriguez", score: 54800, change: 1, level: 6 },
  { rank: 7, userId: "user-7", name: "Mike Thompson", score: 48900, change: -2, level: 6 },
  { rank: 8, userId: "user-8", name: "Jennifer Adams", score: 42100, change: 0, level: 5 },
  { rank: 9, userId: "user-9", name: "Robert Kim", score: 38500, change: 1, level: 5 },
  { rank: 10, userId: "user-10", name: "Amanda Foster", score: 35200, change: -1, level: 4 },
];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || "demo-user";
    const userName = session?.user?.name || "You";
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month"; // week, month, all-time
    const metric = searchParams.get("metric") || "revenue"; // revenue, deals, xp
    const limit = parseInt(searchParams.get("limit") || "10");
    
    // In production, this would query the database
    // For now, insert the current user into the leaderboard if not present
    let leaderboard = [...MOCK_LEADERBOARD];
    
    // Check if current user is in the leaderboard
    const currentUserEntry = leaderboard.find(e => e.userId === userId);
    if (!currentUserEntry) {
      // Add current user at a random position (simulating their actual rank)
      const userRank = Math.floor(Math.random() * 5) + 4; // Rank 4-8
      const userScore = Math.floor(Math.random() * 30000) + 40000; // 40k-70k
      
      leaderboard.push({
        rank: userRank,
        userId,
        name: userName,
        score: userScore,
        change: Math.floor(Math.random() * 5) - 2,
        level: Math.floor(Math.random() * 4) + 4,
      });
      
      // Re-sort and re-rank
      leaderboard.sort((a, b) => b.score - a.score);
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1;
      });
    }
    
    // Apply limit
    const topEntries = leaderboard.slice(0, limit);
    
    // Find current user's position (might be outside top N)
    const userPosition = leaderboard.find(e => e.userId === userId || e.name === userName);
    
    return NextResponse.json({
      success: true,
      data: {
        entries: topEntries,
        currentUser: userPosition || {
          rank: leaderboard.length + 1,
          userId,
          name: userName,
          score: 0,
          change: 0,
          level: 1,
        },
        period,
        metric,
        totalParticipants: leaderboard.length,
      },
    });
  } catch (error) {
    console.error("[Leaderboard] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
