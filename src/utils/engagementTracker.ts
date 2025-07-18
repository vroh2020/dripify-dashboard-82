interface EngagementEvent {
  type: 'view' | 'interaction' | 'conversion' | 'error' | 'idle';
  timestamp: number;
  userId?: string;
  deviceId?: string;
  sessionId: string;
  metadata?: Record<string, any>;
}

interface UserSession {
  sessionId: string;
  startTime: number;
  lastActivity: number;
  events: EngagementEvent[];
  deviceId?: string;
  userId?: string;
}

interface EngagementMetrics {
  sessionDuration: number;
  eventCount: number;
  conversionRate: number;
  retentionScore: number;
  engagementLevel: 'low' | 'medium' | 'high';
}

class EngagementTracker {
  private sessions: Map<string, UserSession> = new Map();
  private currentSessionId: string;
  private isInitialized = false;
  private deviceId?: string;
  private userId?: string;
  private lastActivity = Date.now();
  private idleTimeout = 30000; // 30 seconds
  private sessionTimeout = 1800000; // 30 minutes
  private retentionStrategies: Map<string, () => void> = new Map();

  constructor() {
    this.currentSessionId = this.generateSessionId();
    this.startSessionTracking();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get device and user info
      const { persistenceManager } = await import('@/utils/persistenceManager');
      await persistenceManager.initialize();
      this.deviceId = persistenceManager.getDeviceInfo()?.deviceId;

      // Get user info from auth
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: { user } } = await supabase.auth.getUser();
      this.userId = user?.id;

      this.startActivityTracking();
      this.startRetentionMonitoring();
      this.isInitialized = true;

      console.log('🎯 Engagement tracker initialized');
    } catch (error) {
      console.error('Failed to initialize engagement tracker:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startSessionTracking() {
    // Create new session
    const session: UserSession = {
      sessionId: this.currentSessionId,
      startTime: Date.now(),
      lastActivity: Date.now(),
      events: [],
      deviceId: this.deviceId,
      userId: this.userId
    };

    this.sessions.set(this.currentSessionId, session);
    this.trackEvent('view', { page: 'session_start' });

    // Auto-refresh session every 30 minutes
    setInterval(() => {
      this.refreshSession();
    }, this.sessionTimeout);
  }

  private startActivityTracking() {
    if (typeof window === 'undefined') return;

    let isIdle = false;
    let idleTimer: NodeJS.Timeout;

    const resetIdle = () => {
      if (isIdle) {
        this.trackEvent('interaction', { type: 'user_returned' });
        isIdle = false;
      }
      this.lastActivity = Date.now();
      clearTimeout(idleTimer);
      
      idleTimer = setTimeout(() => {
        isIdle = true;
        this.trackEvent('idle', { duration: this.idleTimeout });
      }, this.idleTimeout);
    };

    // Track user interactions
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, resetIdle, true);
    });

    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.trackEvent('view', { type: 'page_hidden' });
      } else {
        this.trackEvent('view', { type: 'page_visible' });
      }
    });

    // Track before unload
    window.addEventListener('beforeunload', () => {
      this.trackEvent('view', { type: 'page_unload' });
      this.saveSessionData();
    });
  }

  private startRetentionMonitoring() {
    // Check for retention opportunities every 5 minutes
    setInterval(() => {
      this.checkRetentionOpportunities();
    }, 300000);
  }

  trackEvent(type: EngagementEvent['type'], metadata?: Record<string, any>) {
    const event: EngagementEvent = {
      type,
      timestamp: Date.now(),
      userId: this.userId,
      deviceId: this.deviceId,
      sessionId: this.currentSessionId,
      metadata
    };

    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.events.push(event);
      session.lastActivity = Date.now();
    }

    // Log important events
    if (type === 'conversion' || type === 'error') {
      console.log(`🎯 Engagement: ${type}`, metadata);
    }
  }

  trackConversion(funnel: string, step: string, metadata?: Record<string, any>) {
    this.trackEvent('conversion', {
      funnel,
      step,
      ...metadata
    });
  }

  trackError(error: string, metadata?: Record<string, any>) {
    this.trackEvent('error', {
      error,
      ...metadata
    });
  }

  private refreshSession() {
    const oldSessionId = this.currentSessionId;
    this.currentSessionId = this.generateSessionId();
    
    // Save old session
    this.saveSessionData();
    
    // Start new session
    this.startSessionTracking();
    
    console.log(`🔄 Session refreshed: ${oldSessionId} -> ${this.currentSessionId}`);
  }

  private saveSessionData() {
    const session = this.sessions.get(this.currentSessionId);
    if (!session) return;

    try {
      // Save to localStorage for persistence
      const sessionsData = JSON.parse(localStorage.getItem('engagement_sessions') || '[]');
      sessionsData.push({
        ...session,
        endTime: Date.now(),
        duration: Date.now() - session.startTime
      });
      
      // Keep only last 50 sessions
      if (sessionsData.length > 50) {
        sessionsData.splice(0, sessionsData.length - 50);
      }
      
      localStorage.setItem('engagement_sessions', JSON.stringify(sessionsData));
    } catch (error) {
      console.error('Error saving session data:', error);
    }
  }

  getEngagementMetrics(): EngagementMetrics {
    const session = this.sessions.get(this.currentSessionId);
    if (!session) {
      return {
        sessionDuration: 0,
        eventCount: 0,
        conversionRate: 0,
        retentionScore: 0,
        engagementLevel: 'low'
      };
    }

    const sessionDuration = Date.now() - session.startTime;
    const eventCount = session.events.length;
    const conversionEvents = session.events.filter(e => e.type === 'conversion').length;
    const conversionRate = eventCount > 0 ? (conversionEvents / eventCount) * 100 : 0;

    // Calculate retention score based on various factors
    let retentionScore = 0;
    
    // Session duration factor (0-30 points)
    retentionScore += Math.min(sessionDuration / 60000, 30); // 1 point per minute, max 30
    
    // Event frequency factor (0-25 points)
    const eventsPerMinute = eventCount / (sessionDuration / 60000);
    retentionScore += Math.min(eventsPerMinute * 5, 25); // 5 points per event per minute, max 25
    
    // Conversion factor (0-25 points)
    retentionScore += Math.min(conversionRate * 0.25, 25); // 0.25 points per conversion %, max 25
    
    // Error factor (0-20 points, negative)
    const errorEvents = session.events.filter(e => e.type === 'error').length;
    retentionScore -= Math.min(errorEvents * 5, 20); // -5 points per error, max -20
    
    retentionScore = Math.max(0, Math.min(100, retentionScore));

    // Determine engagement level
    let engagementLevel: 'low' | 'medium' | 'high' = 'low';
    if (retentionScore >= 70) engagementLevel = 'high';
    else if (retentionScore >= 40) engagementLevel = 'medium';

    return {
      sessionDuration,
      eventCount,
      conversionRate,
      retentionScore,
      engagementLevel
    };
  }

  private checkRetentionOpportunities() {
    const metrics = this.getEngagementMetrics();
    const session = this.sessions.get(this.currentSessionId);

    if (!session) return;

    // Low engagement strategies
    if (metrics.engagementLevel === 'low' && metrics.sessionDuration > 60000) { // After 1 minute
      this.triggerRetentionStrategy('low_engagement');
    }

    // High engagement strategies
    if (metrics.engagementLevel === 'high' && metrics.conversionRate < 10) {
      this.triggerRetentionStrategy('high_engagement_no_conversion');
    }

    // Error recovery strategies
    const errorEvents = session.events.filter(e => e.type === 'error');
    if (errorEvents.length > 0) {
      this.triggerRetentionStrategy('error_recovery');
    }

    // Idle user strategies
    const idleEvents = session.events.filter(e => e.type === 'idle');
    if (idleEvents.length > 2) { // Multiple idle events
      this.triggerRetentionStrategy('idle_user');
    }
  }

  private triggerRetentionStrategy(strategy: string) {
    const strategyFn = this.retentionStrategies.get(strategy);
    if (strategyFn) {
      console.log(`🎯 Triggering retention strategy: ${strategy}`);
      strategyFn();
    }
  }

  // Register retention strategies
  registerRetentionStrategy(strategy: string, callback: () => void) {
    this.retentionStrategies.set(strategy, callback);
  }

  // Get user behavior insights
  getUserInsights() {
    const metrics = this.getEngagementMetrics();
    const session = this.sessions.get(this.currentSessionId);
    
    if (!session) return null;

    const insights = {
      sessionDuration: metrics.sessionDuration,
      engagementLevel: metrics.engagementLevel,
      retentionScore: metrics.retentionScore,
      eventBreakdown: this.getEventBreakdown(session.events),
      conversionFunnels: this.getConversionFunnels(session.events),
      errorPatterns: this.getErrorPatterns(session.events),
      recommendations: this.generateRecommendations(metrics, session.events)
    };

    return insights;
  }

  private getEventBreakdown(events: EngagementEvent[]) {
    const breakdown: Record<string, number> = {};
    events.forEach(event => {
      breakdown[event.type] = (breakdown[event.type] || 0) + 1;
    });
    return breakdown;
  }

  private getConversionFunnels(events: EngagementEvent[]) {
    const conversionEvents = events.filter(e => e.type === 'conversion');
    const funnels: Record<string, number> = {};
    
    conversionEvents.forEach(event => {
      const funnel = event.metadata?.funnel || 'unknown';
      funnels[funnel] = (funnels[funnel] || 0) + 1;
    });
    
    return funnels;
  }

  private getErrorPatterns(events: EngagementEvent[]) {
    const errorEvents = events.filter(e => e.type === 'error');
    const patterns: Record<string, number> = {};
    
    errorEvents.forEach(event => {
      const error = event.metadata?.error || 'unknown';
      patterns[error] = (patterns[error] || 0) + 1;
    });
    
    return patterns;
  }

  private generateRecommendations(metrics: EngagementMetrics, events: EngagementEvent[]): string[] {
    const recommendations: string[] = [];

    if (metrics.engagementLevel === 'low') {
      recommendations.push('Consider showing onboarding tutorial');
      recommendations.push('Highlight key features and benefits');
      recommendations.push('Offer guided tour of the app');
    }

    if (metrics.conversionRate < 5) {
      recommendations.push('Simplify conversion funnel');
      recommendations.push('Add social proof elements');
      recommendations.push('Offer limited-time incentives');
    }

    const errorEvents = events.filter(e => e.type === 'error');
    if (errorEvents.length > 0) {
      recommendations.push('Improve error handling and recovery');
      recommendations.push('Add helpful error messages');
      recommendations.push('Implement automatic retry mechanisms');
    }

    return recommendations;
  }

  // Export engagement data
  async exportEngagementData() {
    const sessions = Array.from(this.sessions.values());
    const insights = this.getUserInsights();
    
    return {
      currentSession: this.sessions.get(this.currentSessionId),
      allSessions: sessions,
      insights,
      exportTimestamp: Date.now()
    };
  }
}

// Create singleton instance
export const engagementTracker = new EngagementTracker();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  engagementTracker.initialize();
}