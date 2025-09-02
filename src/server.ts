import { Devvit } from "@devvit/public-api";

// Server-side Redis operations for leaderboard
export class LeaderboardService {
  static async getLeaderboard(context: Devvit.Context, subredditName: string) {
    try {
      const leaderboardKey = `leaderboard:${subredditName}`;
      const leaderboardData = await context.redis.get(leaderboardKey);
      
      if (leaderboardData) {
        return JSON.parse(leaderboardData);
      }
      return [];
    } catch (error) {
      console.error('Error getting leaderboard:', error);
      return [];
    }
  }

  static async updateLeaderboard(context: Devvit.Context, subredditName: string, score: string) {
    try {
      const leaderboardKey = `leaderboard:${subredditName}`;
      
      // Get current leaderboard
      const currentLeaderboard = await context.redis.get(leaderboardKey);
      let leaderboard = currentLeaderboard ? JSON.parse(currentLeaderboard) : [];
      
      // Convert score string to number (e.g., "$300K" -> 300000)
      const scoreNumber = parseInt(score.replace(/[$,K]/g, '')) * 1000;
      
      // Get current user's name
      let username = 'Anonymous';
      try {
        const currentUser = await context.reddit.getCurrentUser();
        if (currentUser && currentUser.username) {
          username = currentUser.username;
          console.log('Got username:', username);
        } else {
          console.log('No username found in currentUser:', currentUser);
        }
      } catch (error) {
        console.error('Error getting username:', error);
      }

      // Add new score
      const newEntry = { userId: username, score: scoreNumber };
      leaderboard.push(newEntry);
      
      // Sort by score (highest first) and keep top 10
      leaderboard.sort((a: any, b: any) => b.score - a.score);
      leaderboard = leaderboard.slice(0, 10);
      
      // Save back to Redis
      await context.redis.set(leaderboardKey, JSON.stringify(leaderboard));
      
      console.log('Leaderboard updated:', leaderboard);
      return { success: true, leaderboard };
    } catch (error) {
      console.error('Error updating leaderboard:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  static async clearLeaderboard(context: Devvit.Context, subredditName: string) {
    try {
      const leaderboardKey = `leaderboard:${subredditName}`;
      await context.redis.del(leaderboardKey);
      return { success: true };
    } catch (error) {
      console.error('Error clearing leaderboard:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}





export default Devvit;
