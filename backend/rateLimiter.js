let Redis, NodeCache;
try { Redis = require('ioredis'); } catch(e) { console.warn("ℹ️ Optional dependency 'ioredis' not found. Using memory fallback."); }
try { NodeCache = require('node-cache'); } catch(e) { console.warn("ℹ️ Optional dependency 'node-cache' not found. Using native Map fallback."); }

// Simple in-memory native cache if node-cache is blocked
class SimpleMapCache {
  constructor() { this.store = new Map(); }
  get(k) { 
    const item = this.store.get(k); 
    if(!item) return undefined; 
    if(Date.now() > item.expiry) { this.store.delete(k); return undefined; }
    return item.value; 
  }
  set(k, v, ttlSec) { this.store.set(k, { value: v, expiry: Date.now() + (ttlSec * 1000) }); }
  del(k) { this.store.delete(k); }
  keys() { return Array.from(this.store.keys()); }
}

// Memory cache fallback for development
const memoryCache = NodeCache ? new NodeCache({ stdTTL: 3600 }) : new SimpleMapCache();

// Initialize Redis if URL provided
let redis = null;
try {
  if (process.env.REDIS_URL) {
    redis = new Redis(process.env.REDIS_URL);
    console.log('✅ Redis connected for rate limiting');
  } else {
    console.log('⚠️  No REDIS_URL, using memory cache for rate limiting (not suitable for production)');
  }
} catch (err) {
  console.error('Redis connection failed, using memory cache:', err.message);
}

// Per-ATS limits (based on real-world constraints)
const ATS_LIMITS = {
  greenhouse: { 
    daily: 8, 
    hourly: 3, 
    cooldown: 120,  // minutes
    description: 'Greenhouse ATS - strict limits to avoid detection'
  },
  lever: { 
    daily: 10, 
    hourly: 4, 
    cooldown: 60,
    description: 'Lever ATS - moderate limits'
  },
  workday: { 
    daily: 15, 
    hourly: 5, 
    cooldown: 30,
    description: 'Workday ATS - more forgiving'
  },
  taleo: { 
    daily: 10, 
    hourly: 3, 
    cooldown: 60,
    description: 'Taleo ATS - standard limits'
  },
  default: { 
    daily: 10, 
    hourly: 3, 
    cooldown: 30,
    description: 'Unknown ATS - conservative defaults'
  }
};

// Get or create rate limit counter
async function getCounter(key, ttlSeconds) {
  if (redis) {
    const value = await redis.get(key);
    if (value === null) return 0;
    return parseInt(value, 10);
  } else {
    return memoryCache.get(key) || 0;
  }
}

async function incrementCounter(key, ttlSeconds) {
  if (redis) {
    const newValue = await redis.incr(key);
    if (newValue === 1) {
      await redis.expire(key, ttlSeconds);
    }
    return newValue;
  } else {
    const current = memoryCache.get(key) || 0;
    const newValue = current + 1;
    memoryCache.set(key, newValue, ttlSeconds);
    return newValue;
  }
}

async function checkRateLimit(userId, atsType = 'default') {
  const limits = ATS_LIMITS[atsType] || ATS_LIMITS.default;
  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const hourKey = `${today}:${now.getHours()}`;
  
  // 1. Check daily limit per ATS
  const dailyKey = `rate:${userId}:${atsType}:${today}`;
  const dailyCount = await incrementCounter(dailyKey, 86400);
  
  if (dailyCount > limits.daily) {
    return {
      allowed: false,
      reason: `daily_${atsType}`,
      message: `Daily limit reached for ${atsType.toUpperCase()} applications. Try again tomorrow.`,
      resetAt: new Date(Date.now() + 86400000).toISOString()
    };
  }
  
  // 2. Check hourly limit
  const hourlyKey = `rate:${userId}:${atsType}:${hourKey}`;
  const hourlyCount = await incrementCounter(hourlyKey, 3600);
  
  if (hourlyCount > limits.hourly) {
    const resetAt = new Date(Date.now() + (3600000 - (Date.now() % 3600000)));
    return {
      allowed: false,
      reason: `hourly_${atsType}`,
      message: `Please wait ${Math.ceil(limits.cooldown)} minutes before applying to more ${atsType.toUpperCase()} jobs.`,
      resetAt: resetAt.toISOString()
    };
  }
  
  // 3. Check global daily limit (all ATS combined)
  const globalKey = `rate:${userId}:global:${today}`;
  const globalCount = await incrementCounter(globalKey, 86400);
  
  if (globalCount > 20) { // 20 total per day across all platforms
    return {
      allowed: false,
      reason: 'daily_global',
      message: 'Daily application limit reached (20 max). Focus on quality over quantity!',
      resetAt: new Date(Date.now() + 86400000).toISOString()
    };
  }
  
  // 4. Return success with remaining counts
  return {
    allowed: true,
    remaining: {
      [atsType]: limits.daily - dailyCount,
      global: 20 - globalCount
    },
    limits: limits
  };
}

// Express middleware
function rateLimitMiddleware(req, res, next) {
  const userId = req.user?.id || req.body?.user_id || req.query?.user_id;
  if (!userId) {
    return res.status(400).json({ error: 'User ID required for rate limiting' });
  }
  
  const atsType = req.body?.ats_type || req.query?.ats_type || 'default';
  
  checkRateLimit(userId, atsType)
    .then(result => {
      if (!result.allowed) {
        return res.status(429).json({
          error: result.message,
          reset_at: result.resetAt,
          reason: result.reason
        });
      }
      
      // Add rate limit info to response headers
      res.setHeader('X-RateLimit-Limit', result.remaining[atsType]);
      res.setHeader('X-RateLimit-Remaining', result.remaining[atsType]);
      res.setHeader('X-RateLimit-Global-Remaining', result.remaining.global);
      
      next();
    })
    .catch(err => {
      console.error('Rate limiter error:', err);
      // Fail open - allow request if rate limiter fails
      next();
    });
}

// Cleanup function for testing
async function resetRateLimits(userId) {
  const keys = await redis?.keys(`rate:${userId}:*`) || [];
  for (const key of keys) {
    await redis?.del(key);
  }
  // Clear memory cache
  const memoryKeys = memoryCache.keys().filter(k => k.startsWith(`rate:${userId}:`));
  for (const key of memoryKeys) {
    memoryCache.del(key);
  }
}

module.exports = { 
  checkRateLimit, 
  rateLimitMiddleware, 
  ATS_LIMITS,
  resetRateLimits 
};
