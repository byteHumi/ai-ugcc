/**
 * Token bucket rate limiter for controlling API request rates.
 * Used primarily for RapidAPI TikTok download endpoint (9 req/sec limit).
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRateMs: number; // ms per token

  constructor(maxRequestsPerSecond: number) {
    this.maxTokens = maxRequestsPerSecond;
    this.tokens = maxRequestsPerSecond;
    this.refillRateMs = 1000 / maxRequestsPerSecond;
    this.lastRefill = Date.now();
  }

  /**
   * Acquire a token, waiting if necessary.
   * Call this before making a rate-limited API request.
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time for next token
    const waitTime = this.refillRateMs - (Date.now() - this.lastRefill);
    if (waitTime > 0) {
      await this.sleep(waitTime);
    }

    // Refill and try again
    this.refill();
    this.tokens -= 1;
  }

  /**
   * Try to acquire a token without waiting.
   * Returns true if successful, false if rate limited.
   */
  tryAcquire(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Get current number of available tokens.
   */
  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed / this.refillRateMs;

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// RapidAPI rate limiter - 9 requests per second for TikTok download
export const rapidApiLimiter = new RateLimiter(9);

// Export the class for custom limiters
export { RateLimiter };
