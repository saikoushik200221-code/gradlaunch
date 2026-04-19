/**
 * A/B Testing Service - Experiment management and analysis
 */

class ABTestingService {
  constructor(db) {
    this.db = db;
    this.activeExperiments = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    this.cache = new Map();
  }

  /**
   * Register a new experiment
   */
  async registerExperiment(experiment) {
    const {
      name,
      description,
      variants,
      targeting = {},
      startDate = new Date(),
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      metrics = ['conversion_rate', 'user_engagement']
    } = experiment;
    
    try {
      // Check if experiment already exists
      const existing = await this.db.get(
        'SELECT id FROM experiments WHERE name = ?',
        [name]
      );
      
      if (existing) {
        console.log(`[ABTesting] Experiment "${name}" already exists, updating...`);
        await this.db.run(`
          UPDATE experiments 
          SET description = ?, variants = ?, targeting = ?, 
              start_date = ?, end_date = ?, metrics = ?, updated_at = ?
          WHERE name = ?
        `, [
          description, JSON.stringify(variants), JSON.stringify(targeting),
          startDate.toISOString(), endDate.toISOString(), JSON.stringify(metrics),
          new Date().toISOString(), name
        ]);
        return { success: true, experimentId: existing.id };
      }
      
      // Create new experiment
      const result = await this.db.run(`
        INSERT INTO experiments (
          name, description, variants, targeting, 
          start_date, end_date, metrics, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `, [
        name, description, JSON.stringify(variants), JSON.stringify(targeting),
        startDate.toISOString(), endDate.toISOString(), JSON.stringify(metrics),
        new Date().toISOString(), new Date().toISOString()
      ]);
      
      const experimentId = result.lastID;
      this.activeExperiments.set(experimentId, experiment);
      
      console.log(`[ABTesting] Registered experiment: ${name} (ID: ${experimentId})`);
      return { success: true, experimentId };
    } catch (err) {
      console.error('[ABTesting] Failed to register experiment:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Assign user to experiment variant (deterministic)
   */
  async assignVariant(userId, experimentName) {
    // Check cache first
    const cacheKey = `${userId}:${experimentName}`;
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.variant;
      }
    }
    
    try {
      // Check if user already assigned
      const existing = await this.db.get(`
        SELECT ea.variant, e.name
        FROM experiment_assignments ea
        JOIN experiments e ON ea.experiment_id = e.id
        WHERE ea.user_id = ? AND e.name = ? AND e.status = 'active'
      `, [userId, experimentName]);
      
      if (existing) {
        const variant = JSON.parse(existing.variant);
        this.cache.set(cacheKey, { variant, timestamp: Date.now() });
        return variant;
      }
      
      // Get experiment
      const experiment = await this.db.get(`
        SELECT id, variants, targeting, start_date, end_date 
        FROM experiments 
        WHERE name = ? AND status = 'active'
      `, [experimentName]);
      
      if (!experiment) return null;
      
      const exp = experiment;
      const variants = JSON.parse(exp.variants);
      const targeting = JSON.parse(exp.targeting || '{}');
      
      // Check if user meets targeting criteria
      if (!this.meetsTargeting(userId, targeting)) {
        return null;
      }
      
      // Check if experiment is active
      const now = new Date();
      const startDate = new Date(exp.start_date);
      const endDate = new Date(exp.end_date);
      
      if (now < startDate || now > endDate) {
        return null;
      }
      
      // Deterministic assignment based on user ID hash
      const hash = this.hashString(`${userId}-${experimentName}`);
      const variantIndex = hash % variants.length;
      const assignedVariant = variants[variantIndex];
      
      // Store assignment
      await this.db.run(`
        INSERT INTO experiment_assignments (user_id, experiment_id, variant, assigned_at)
        VALUES (?, ?, ?, ?)
      `, [userId, exp.id, JSON.stringify(assignedVariant), new Date().toISOString()]);
      
      // Cache the result
      this.cache.set(cacheKey, { variant: assignedVariant, timestamp: Date.now() });
      
      // Track assignment event
      await this.trackEvent(userId, experimentName, 'assigned', {
        variant: assignedVariant.name,
        hash,
        variantIndex
      });
      
      return assignedVariant;
    } catch (err) {
      console.error('[ABTesting] Failed to assign variant:', err);
      return null;
    }
  }

  /**
   * Check if user meets targeting criteria
   */
  meetsTargeting(userId, targeting) {
    // User percentage targeting
    if (targeting.user_percentage) {
      const hash = this.hashString(userId.toString());
      const percentile = (hash % 100) / 100;
      if (percentile > targeting.user_percentage / 100) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get variant configuration for user
   */
  async getVariantConfig(userId, experimentName) {
    const variant = await this.assignVariant(userId, experimentName);
    if (!variant) return null;
    
    return {
      name: variant.name,
      config: variant.config,
      experiment: experimentName
    };
  }

  /**
   * Track experiment event
   */
  async trackEvent(userId, experimentName, eventType, metadata = {}) {
    try {
      await this.db.run(`
        INSERT INTO experiment_events (
          user_id, experiment_id, event_type, metadata, created_at
        ) VALUES (?, (
          SELECT id FROM experiments WHERE name = ?
        ), ?, ?, ?)
      `, [userId, experimentName, eventType, JSON.stringify(metadata), new Date().toISOString()]);
    } catch (err) {
      console.error('[ABTesting] Failed to track event:', err);
    }
  }

  /**
   * Get experiment results with statistical analysis
   */
  async getExperimentResults(experimentName) {
    const experiment = await this.db.get(`
      SELECT id, name, variants, metrics, status, start_date, end_date
      FROM experiments 
      WHERE name = ?
    `, [experimentName]);
    
    if (!experiment) return null;
    
    const exp = experiment;
    const variants = JSON.parse(exp.variants);
    const metrics = JSON.parse(exp.metrics || '[]');
    
    // Get assignment and event data
    const data = await this.db.all(`
      SELECT 
        ea.variant,
        COUNT(DISTINCT ea.user_id) as users,
        ee.event_type,
        COUNT(ee.id) as event_count
      FROM experiment_assignments ea
      LEFT JOIN experiment_events ee ON ea.user_id = ee.user_id 
        AND ee.experiment_id = ea.experiment_id
      WHERE ea.experiment_id = ?
      GROUP BY ea.variant, ee.event_type
    `, [exp.id]);
    
    // Parse and analyze results
    const results = {};
    variants.forEach(variant => {
      results[variant.name] = {
        variant: variant,
        users: 0,
        events: {},
        metrics: {}
      };
    });
    
    data.forEach(row => {
      const variant = JSON.parse(row.variant);
      if (results[variant.name]) {
        results[variant.name].users = row.users;
        if (row.event_type) {
          results[variant.name].events[row.event_type] = row.event_count;
        }
      }
    });
    
    // Calculate metrics
    const analysis = this.analyzeResults(results, variants, metrics);
    
    return {
      experiment: {
        id: exp.id,
        name: exp.name,
        status: exp.status,
        start_date: exp.start_date,
        end_date: exp.end_date
      },
      variants: results,
      analysis,
      recommendations: this.generateRecommendations(analysis)
    };
  }

  /**
   * Analyze experiment results with statistical significance
   */
  analyzeResults(results, variants, metrics) {
    const variantNames = Object.keys(results);
    if (variantNames.length < 2) return null;
    
    const analysis = {
      metrics: {},
      significant_findings: [],
      confidence_levels: {}
    };
    
    // Calculate conversion rates for each metric
    metrics.forEach(metric => {
      const control = results[variantNames[0]];
      const treatment = results[variantNames[1]];
      
      const controlRate = control.users > 0 ? (control.events[metric] || 0) / control.users : 0;
      const treatmentRate = treatment.users > 0 ? (treatment.events[metric] || 0) / treatment.users : 0;
      
      const lift = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0;
      const confidence = this.calculateStatisticalSignificance(
        control.events[metric] || 0, 
        control.users,
        treatment.events[metric] || 0,
        treatment.users
      );
      
      analysis.metrics[metric] = {
        control_rate: controlRate,
        treatment_rate: treatmentRate,
        lift: lift.toFixed(2) + '%',
        confidence: (confidence * 100).toFixed(1) + '%',
        significant: confidence > 0.95
      };
      
      if (confidence > 0.95 && Math.abs(lift) > 5) {
        analysis.significant_findings.push({
          metric,
          winner: lift > 0 ? variantNames[1] : variantNames[0],
          lift: lift.toFixed(2) + '%',
          confidence: (confidence * 100).toFixed(1) + '%'
        });
      }
    });
    
    return analysis;
  }

  /**
   * Calculate statistical significance using z-test
   */
  calculateStatisticalSignificance(controlConversions, controlTotal, treatmentConversions, treatmentTotal) {
    if (controlTotal < 10 || treatmentTotal < 10) return 0;
    const p1 = controlConversions / controlTotal;
    const p2 = treatmentConversions / treatmentTotal;
    const pPooled = (controlConversions + treatmentConversions) / (controlTotal + treatmentTotal);
    
    if (pPooled === 0 || pPooled === 1) return 0;
    const se = Math.sqrt(pPooled * (1 - pPooled) * (1/controlTotal + 1/treatmentTotal));
    const z = Math.abs(p1 - p2) / se;
    
    // Convert z-score to p-value (simplified approximation)
    const pValue = Math.exp(-0.717 * z - 0.416 * z * z);
    
    return 1 - pValue;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations(analysis) {
    if (!analysis || !analysis.significant_findings.length) {
      return [{
        action: 'Continue experiment',
        reason: 'Insufficient data or no significant results yet',
        priority: 'low'
      }];
    }
    
    const recommendations = [];
    const winners = {};
    
    analysis.significant_findings.forEach(finding => {
      if (!winners[finding.winner]) {
        winners[finding.winner] = [];
      }
      winners[finding.winner].push(finding);
    });
    
    const topWinner = Object.keys(winners).sort((a, b) => 
      winners[b].length - winners[a].length
    )[0];
    
    const avgLift = winners[topWinner].reduce((sum, f) => 
      sum + parseFloat(f.lift), 0) / (winners[topWinner].length || 1);
    
    if (avgLift > 10) {
      recommendations.push({
        action: `Promote variant "${topWinner}" to 100%`,
        reason: `Significant improvement across ${winners[topWinner].length} metrics with ${avgLift.toFixed(1)}% average lift`,
        priority: 'high',
        confidence: analysis.significant_findings[0].confidence
      });
    } else if (avgLift > 5) {
      recommendations.push({
        action: `Gradually roll out variant "${topWinner}" to 50% of users`,
        reason: `Positive trend with ${avgLift.toFixed(1)}% average lift`,
        priority: 'medium',
        confidence: analysis.significant_findings[0].confidence
      });
    } else {
      recommendations.push({
        action: 'Continue monitoring',
        reason: 'Marginal improvement observed, need more data',
        priority: 'low'
      });
    }
    
    return recommendations;
  }

  /**
   * Promote a winning variant to 100%
   */
  async promoteWinner(experimentName, winnerVariant) {
    try {
      await this.db.run(`
        UPDATE experiments 
        SET winner_variant = ?, status = 'completed', updated_at = ?
        WHERE name = ?
      `, [winnerVariant, new Date().toISOString(), experimentName]);
      
      console.log(`[ABTesting] Promoted "${winnerVariant}" as winner for experiment "${experimentName}"`);
      return { success: true };
    } catch (err) {
      console.error('[ABTesting] Failed to promote winner:', err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Simple hash function for deterministic assignment
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }
}

module.exports = { ABTestingService };
