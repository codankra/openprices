interface RateLimitRule {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests allowed in the window
}

class RateLimiter {
  private requests: Map<string, number[]>;
  private rules: Map<string, RateLimitRule>;

  constructor() {
    this.requests = new Map();
    this.rules = new Map();
  }

  /**
   * Add a rate limit rule for a specific service
   */
  addRule(serviceKey: string, rule: RateLimitRule) {
    this.rules.set(serviceKey, rule);
  }

  /**
   * Check if a request can be made for a given service
   * Returns true if the request is allowed, false if it would exceed the rate limit
   */
  async canMakeRequest(serviceKey: string): Promise<boolean> {
    const rule = this.rules.get(serviceKey);
    if (!rule) {
      console.warn(`No rate limit rule found for service: ${serviceKey}`);
      return true; // Allow if no rule exists
    }

    const now = Date.now();
    const windowStart = now - rule.windowMs;

    // Get or initialize request timestamps for this service
    let timestamps = this.requests.get(serviceKey) || [];

    // Remove old timestamps outside the current window
    timestamps = timestamps.filter((time) => time > windowStart);

    // Check if adding a new request would exceed the limit
    if (timestamps.length >= rule.maxRequests) {
      return false;
    }

    // Add the new timestamp and update the map
    timestamps.push(now);
    this.requests.set(serviceKey, timestamps);

    return true;
  }

  /**
   * Wraps an async function with rate limiting
   */
  wrapWithRateLimit<T>(
    serviceKey: string,
    fn: (...args: any[]) => Promise<T>
  ): (...args: any[]) => Promise<T> {
    return async (...args: any[]): Promise<T> => {
      const canProceed = await this.canMakeRequest(serviceKey);
      if (!canProceed) {
        throw new Error(`Rate limit exceeded for service: ${serviceKey}`);
      }
      return fn(...args);
    };
  }
}

// Create a singleton instance
const rateLimiter = new RateLimiter();

// Configure default rules
rateLimiter.addRule("vertex-ai", {
  windowMs: 60 * 1000,
  maxRequests: 5,
});

export { rateLimiter };
