/**
 * Analytics Service - Comprehensive monitoring and optimization
 */

class AnalyticsService {
  constructor(db) {
    this.db = db;
    this.costPerToken = {
      'gemini-pro': 0.000000125,      // $0.125 per 1M tokens
      'gemini-1.5-flash': 0.000000075, // $0.075 per 1M tokens
      'gemini-1.5-pro': 0.00000025     // $0.25 per 1M tokens
    };
  }

  /**
   * Log Gemini API usage with detailed metrics
   */
  async logGeminiUsage(userId, model, endpoint, promptTokens, responseTokens, duration, success = true, error = null) {
    const totalTokens = promptTokens + responseTokens;
    const estimatedCost = totalTokens * (this.costPerToken[model] || 0.000000125);
    
    try {
      await this.db.run(`
        INSERT INTO gemini_usage_logs (
          user_id, model, endpoint, prompt_tokens, response_tokens, 
          total_tokens, estimated_cost, duration_ms, success, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, model, endpoint, promptTokens, responseTokens,
        totalTokens, estimatedCost, duration, success ? 1 : 0, 
        error, new Date().toISOString()
      ]);
      
      // Update daily aggregates
      await this.updateDailyMetrics();
      
      return { 
        logged: true, 
        estimatedCost,
        totalTokens
      };
    } catch (err) {
      console.error('[Analytics] Failed to log Gemini usage:', err);
      return { logged: false, error: err.message };
    }
  }

  /**
   * Log match feedback with detailed rating
   */
  async logMatchFeedback(userId, jobId, matchScore, userRating, userComments = null, actualApplication = false, applicationId = null) {
    try {
      const result = await this.db.run(`
        INSERT INTO match_feedback (
          user_id, job_id, match_score, user_rating, 
          user_comments, actual_application, application_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, jobId, matchScore, userRating,
        userComments, actualApplication ? 1 : 0, applicationId, new Date().toISOString()
      ]);
      
      // Update daily aggregates
      await this.updateDailyMetrics();
      
      return { success: true, feedbackId: result.lastID };
    } catch (err) {
      console.error('[Analytics] Failed to log match feedback:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Track user session
   */
  async trackSession(userId, sessionId, action = null) {
    try {
      // Check if session exists
      const existing = await this.db.get(
        'SELECT id FROM user_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      if (!existing) {
        // Create new session
        await this.db.run(`
          INSERT INTO user_sessions (user_id, session_id, start_time, created_at)
          VALUES (?, ?, ?, ?)
        `, [userId, sessionId, new Date().toISOString(), new Date().toISOString()]);
      } else if (action) {
        // Update session activity
        await this.db.run(`
          UPDATE user_sessions 
          SET page_views = page_views + 1,
              actions_taken = actions_taken + 1
          WHERE session_id = ?
        `, [sessionId]);
      }
    } catch (err) {
      console.error('[Analytics] Failed to track session:', err);
    }
  }

  /**
   * Close session
   */
  async closeSession(sessionId) {
    try {
      const session = await this.db.get(
        'SELECT start_time FROM user_sessions WHERE session_id = ?',
        [sessionId]
      );
      
      if (session) {
        const startTime = new Date(session.start_time);
        const endTime = new Date();
        const durationSeconds = Math.floor((endTime - startTime) / 1000);
        
        await this.db.run(`
          UPDATE user_sessions 
          SET end_time = ?, duration_seconds = ?
          WHERE session_id = ?
        `, [endTime.toISOString(), durationSeconds, sessionId]);
      }
    } catch (err) {
      console.error('[Analytics] Failed to close session:', err);
    }
  }

  /**
   * Update daily aggregated metrics
   */
  async updateDailyMetrics() {
    const today = new Date().toISOString().split('T')[0];
    
    try {
      const row = await this.db.get(`
        SELECT 
          COUNT(DISTINCT u.id) as total_users,
          COUNT(DISTINCT CASE WHEN u.last_active_at >= DATE('now', '-1 day') THEN u.id END) as active_users,
          COUNT(g.id) as gemini_requests,
          SUM(g.total_tokens) as gemini_tokens,
          SUM(g.estimated_cost) as gemini_cost,
          COUNT(m.id) as matches_shown,
          SUM(CASE WHEN m.actual_application = 1 THEN 1 ELSE 0 END) as applications_submitted,
          COUNT(m.id) as feedback_submitted,
          AVG(m.user_rating) as avg_match_rating
        FROM users u
        LEFT JOIN gemini_usage_logs g ON DATE(g.created_at) = DATE('now')
        LEFT JOIN match_feedback m ON DATE(m.created_at) = DATE('now')
        WHERE DATE(u.created_at) <= DATE('now')
      `);
      
      // Insert or replace daily metrics
      await this.db.run(`
        INSERT OR REPLACE INTO daily_metrics (
          date, total_users, active_users, gemini_requests, gemini_tokens,
          gemini_cost, matches_shown, applications_submitted, 
          feedback_submitted, avg_match_rating, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        today,
        row.total_users || 0,
        row.active_users || 0,
        row.gemini_requests || 0,
        row.gemini_tokens || 0,
        row.gemini_cost || 0,
        row.matches_shown || 0,
        row.applications_submitted || 0,
        row.feedback_submitted || 0,
        row.avg_match_rating || 0,
        new Date().toISOString()
      ]);
    } catch (err) {
      console.error('[Analytics] Failed to update daily metrics:', err);
    }
  }

  /**
   * Get detailed usage statistics
   */
  async getUsageStats(days = 7, userId = null) {
    let query = `
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as requests,
        SUM(total_tokens) as total_tokens,
        SUM(estimated_cost) as total_cost,
        AVG(duration_ms) as avg_duration_ms,
        endpoint,
        model,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful_requests,
        AVG(CASE WHEN success = 1 THEN duration_ms END) as avg_success_duration
      FROM gemini_usage_logs
      WHERE created_at >= DATE('now', ?)
    `;
    
    const params = [`-${days} days`];
    
    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }
    
    query += `
      GROUP BY DATE(created_at), endpoint, model
      ORDER BY date DESC
    `;
    
    return await this.db.all(query, params);
  }

  /**
   * Get match accuracy metrics
   */
  async getMatchAccuracyStats(days = 30) {
    const byRating = await this.db.all(`
      SELECT 
        user_rating,
        COUNT(*) as rating_count,
        AVG(match_score) as avg_predicted_score
      FROM match_feedback
      WHERE created_at >= DATE('now', ?)
      GROUP BY user_rating
    `, [`-${days} days`]);
    
    // Calculate overall metrics
    const overall = await this.db.get(`
      SELECT 
        AVG(CASE WHEN user_rating >= 4 THEN 1 ELSE 0 END) as positive_rate,
        AVG(user_rating) as avg_rating,
        COUNT(*) as total,
        SUM(CASE WHEN actual_application = 1 THEN 1 ELSE 0 END) as applications
      FROM match_feedback
      WHERE created_at >= DATE('now', ?)
    `, [`-${days} days`]);
    
    return {
      by_rating: byRating,
      overall: overall,
      sample_size: overall ? overall.total : 0
    };
  }

  /**
   * Get cost projection with recommendations
   */
  async getCostProjection(days = 30) {
    const stats = await this.getUsageStats(days);
    
    const totalCost = stats.reduce((sum, row) => sum + (row.total_cost || 0), 0);
    const totalRequests = stats.reduce((sum, row) => sum + (row.requests || 0), 0);
    const dayCount = Math.min(stats.length, days) || 1;
    const dailyAvg = totalCost / dayCount;
    const requestsDailyAvg = totalRequests / dayCount;
    
    const projection = {
      last_period_cost: totalCost,
      last_period_days: dayCount,
      average_daily_cost: dailyAvg,
      average_daily_requests: requestsDailyAvg,
      projected_monthly_cost: dailyAvg * 30,
      projected_annual_cost: dailyAvg * 365,
      cost_per_request: totalCost / totalRequests || 0,
      growth_trend: this.calculateGrowthTrend(stats)
    };
    
    projection.recommendations = this.generateCostRecommendations(projection);
    
    return projection;
  }

  /**
   * Calculate growth trend from historical data
   */
  calculateGrowthTrend(stats) {
    if (stats.length < 7) return { trend: 'insufficient_data', change: 0 };
    
    const recent = stats.slice(0, 7);
    const previous = stats.slice(7, 14);
    
    const recentAvg = recent.reduce((sum, s) => sum + (s.total_cost || 0), 0) / (recent.length || 1);
    const previousAvg = previous.reduce((sum, s) => sum + (s.total_cost || 0), 0) / (previous.length || 1);
    
    const change = previousAvg === 0 ? (recentAvg > 0 ? 100 : 0) : ((recentAvg - previousAvg) / previousAvg) * 100;
    
    return {
      trend: change > 10 ? 'rapid_growth' : change > 0 ? 'growth' : change < -10 ? 'declining' : 'stable',
      change_percent: change.toFixed(1),
      recent_average: recentAvg,
      previous_average: previousAvg
    };
  }

  /**
   * Generate cost optimization recommendations
   */
  generateCostRecommendations(projection) {
    const recommendations = [];
    
    if (projection.projected_monthly_cost > 100) {
      recommendations.push({
        priority: 'high',
        category: 'caching',
        action: 'Implement response caching for common job descriptions',
        estimated_savings: '40-50%',
        implementation_time: '2-3 days',
        roi: 'excellent'
      });
    }
    
    if (projection.projected_monthly_cost > 50) {
      recommendations.push({
        priority: 'medium',
        category: 'prompt_optimization',
        action: 'Reduce prompt length by summarizing job descriptions to 500 tokens',
        estimated_savings: '25-35%',
        implementation_time: '1 day',
        roi: 'good'
      });
    }
    
    if (projection.cost_per_request > 0.001) {
      recommendations.push({
        priority: 'medium',
        category: 'model_selection',
        action: 'Use gemini-1.5-flash for non-critical generations',
        estimated_savings: '30-40%',
        implementation_time: '2 days',
        roi: 'very good'
      });
    }
    
    if (projection.growth_trend.trend === 'rapid_growth') {
      recommendations.push({
        priority: 'high',
        category: 'rate_limiting',
        action: 'Implement stricter rate limiting for power users',
        estimated_savings: '15-20%',
        implementation_time: '1 day',
        roi: 'good'
      });
    }
    
    recommendations.push({
      priority: 'low',
      category: 'batch_processing',
      action: 'Batch process non-urgent AI generations during off-peak hours',
      estimated_savings: '10-15%',
      implementation_time: '3-5 days',
      roi: 'moderate'
    });
    
    return recommendations;
  }

  /**
   * Get user engagement metrics
   */
  async getEngagementStats(days = 30) {
    return await this.db.all(`
      SELECT 
        DATE(created_at) as date,
        COUNT(DISTINCT user_id) as active_users,
        COUNT(*) as total_sessions,
        AVG(duration_seconds) as avg_session_duration,
        AVG(page_views) as avg_page_views,
        AVG(actions_taken) as avg_actions
      FROM user_sessions
      WHERE created_at >= DATE('now', ?)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [`-${days} days`]);
  }

  /**
   * Generate comprehensive dashboard report
   */
  async generateDashboardReport() {
    const [usage, matchAccuracy, costs, engagement] = await Promise.all([
      this.getUsageStats(30),
      this.getMatchAccuracyStats(30),
      this.getCostProjection(30),
      this.getEngagementStats(30)
    ]);
    
    return {
      generated_at: new Date().toISOString(),
      usage: {
        total_requests_30d: usage.reduce((sum, r) => sum + r.requests, 0),
        total_tokens_30d: usage.reduce((sum, r) => sum + (r.total_tokens || 0), 0),
        by_endpoint: this.groupBy(usage, 'endpoint'),
        by_model: this.groupBy(usage, 'model')
      },
      match_accuracy: matchAccuracy,
      costs: costs,
      engagement: {
        active_users_30d: engagement.length,
        avg_daily_active_users: engagement.length > 0 ? (engagement.reduce((sum, e) => sum + e.active_users, 0) / engagement.length) : 0,
        avg_session_duration: engagement.length > 0 ? (engagement.reduce((sum, e) => sum + e.avg_session_duration, 0) / engagement.length) : 0
      },
      health_score: this.calculateHealthScore(matchAccuracy, costs, engagement)
    };
  }

  /**
   * Calculate overall platform health score (0-100)
   */
  calculateHealthScore(matchAccuracy, costs, engagement) {
    let score = 0;
    
    // Match accuracy contribution (40% of score)
    const positiveRate = matchAccuracy.overall?.positive_rate || 0;
    score += positiveRate * 40;
    
    // Cost efficiency (30% of score) - lower is better
    const monthlyCost = costs.projected_monthly_cost || 0;
    const costScore = Math.max(0, 30 * (1 - Math.min(1, monthlyCost / 200)));
    score += costScore;
    
    // Engagement (30% of score)
    const activeUsers = engagement.length || 0;
    const engagementScore = Math.min(30, (activeUsers / 100) * 30);
    score += engagementScore;
    
    return Math.round(score);
  }

  /**
   * Helper: Group array by field
   */
  groupBy(arr, field) {
    const grouped = {};
    arr.forEach(item => {
      const key = item[field];
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    return grouped;
  }
}

module.exports = { AnalyticsService };
