# Development Issues & Solutions

## Server-Side Operations in Devvit Blocks

### Issue: ServerCallRequired Error
When trying to access Redis or Reddit APIs from button handlers, we encountered `ServerCallRequired` errors.

**Root Cause:**
- Initially tried to use the render-phase context in button handlers
- Button handlers were written expecting a second context argument: `onPress={async (_evt, ctx) => ...}`
- The context was undefined, causing `ctx.reddit` calls to fail

**Solution:**
1. Use the captured `context` from the render scope inside handlers
2. Remove the expectation of a second argument in button handlers
3. Update all server operations to use the captured context:
   ```typescript
   // Before
   onPress={async (_evt, ctx) => {
     const subreddit = await ctx.reddit.getCurrentSubreddit();
   }}

   // After
   onPress={async () => {
     const subreddit = await context.reddit.getCurrentSubreddit();
   }}
   ```

## Leaderboard Implementation

### Issue: Sample Data Persistence
The leaderboard was showing hardcoded sample data even after implementing Redis storage.

**Root Cause:**
- Sample data was mixed with real user scores in Redis
- No clear separation between test data and real data

**Solution:**
1. Clear old sample data from Redis
2. Implement proper user score tracking
3. Show "No scores yet" message when leaderboard is empty

## Milestone Questions

### Issue: Overlapping Game States
The milestone prompt and game over screen were showing simultaneously when losing on a milestone question.

**Root Cause:**
- Both conditions (`showWalkAway` and game status) could be true at the same time
- No clear hierarchy of which screen should take precedence

**Solution:**
1. Add condition to only show milestone prompt during active gameplay
2. Ensure game over screen takes precedence over milestone prompt
3. Clear milestone state when game ends

## Sentry Import Error

### Issue: Failed to fetch Sentry module
Console showing error: `Failed to fetch dynamically imported module: .../sentry-*.js`

**Root Cause:**
- Privacy/shield extensions (Brave, uBlock, etc.) blocking Reddit's Sentry analytics bundle

**Solution:**
- This is unrelated to app logic and can be safely ignored
- Optionally disable shields for reddit.com/redditstatic.com during testing

## Best Practices Learned

1. **Server-Side Operations:**
   - Keep Redis/Reddit API calls in button handlers only
   - Use the render context properly
   - No API calls in top-level code or useEffect

2. **State Management:**
   - Clear state when transitioning between game phases
   - Handle edge cases (e.g., milestone + game over)
   - Reset all state when starting new games

3. **Error Handling:**
   - Provide fallbacks for server operation failures
   - Clear error messages for users
   - Maintain game state integrity during errors

4. **Testing:**
   - Test in real subreddit install, not just Playground
   - Check edge cases (milestone questions, walk away, etc.)
   - Verify leaderboard persistence between sessions
