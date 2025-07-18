import Logger from './logger';

interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

interface UserEvent {
  event: string;
  timestamp: number;
  userId?: string;
  deviceId?: string;
  metadata?: Record<string, any>;
}

interface ConversionEvent {
  funnel: string;
  step: string;
  userId?: string;
  deviceId?: string;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private events: UserEvent[] = [];
  private conversions: ConversionEvent[] = [];
  private isInitialized = false;
  private deviceId?: string;

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Get device ID from persistence manager
      const { persistenceManager } = await import('@/utils/persistenceManager');
      await persistenceManager.initialize();
      this.deviceId = persistenceManager.getDeviceInfo()?.deviceId;

      // Start performance monitoring
      this.startPerformanceTracking();
      this.startErrorTracking();
      this.startUserBehaviorTracking();

      this.isInitialized = true;
      console.log('🚀 Performance monitor initialized');
    } catch (error) {
      console.error('Failed to initialize performance monitor:', error);
    }
  }

  private startPerformanceTracking() {
    // Track page load times
    if (typeof window !== 'undefined') {
      window.addEventListener('load', () => {
        const loadTime = performance.now();
        this.recordMetric('page_load_time', loadTime, 'ms');
      });

      // Track navigation timing
      if ('navigation' in performance) {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (nav) {
          this.recordMetric('dom_content_loaded', nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart, 'ms');
          this.recordMetric('first_paint', nav.loadEventEnd - nav.loadEventStart, 'ms');
        }
      }

      // Track memory usage
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.recordMetric('memory_used', memory.usedJSHeapSize, 'bytes');
        this.recordMetric('memory_limit', memory.jsHeapSizeLimit, 'bytes');
      }
    }
  }

  private startErrorTracking() {
    if (typeof window !== 'undefined') {
      // Track JavaScript errors
      window.addEventListener('error', (event) => {
        this.recordEvent('error', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack
        });
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.recordEvent('unhandled_rejection', {
          reason: event.reason,
          promise: event.promise
        });
      });
    }
  }

  private startUserBehaviorTracking() {
    if (typeof window !== 'undefined') {
      // Track user interactions
      let lastActivity = Date.now();
      let isIdle = false;

      const resetIdle = () => {
        if (isIdle) {
          this.recordEvent('user_returned', {
            idleDuration: Date.now() - lastActivity
          });
          isIdle = false;
        }
        lastActivity = Date.now();
      };

      // Track user activity
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, resetIdle, true);
      });

      // Track idle time
      setInterval(() => {
        if (Date.now() - lastActivity > 30000 && !isIdle) { // 30 seconds
          isIdle = true;
          this.recordEvent('user_idle', {
            idleDuration: 30000
          });
        }
      }, 10000); // Check every 10 seconds

      // Track page visibility
      document.addEventListener('visibilitychange', () => {
        this.recordEvent('visibility_change', {
          hidden: document.hidden,
          timestamp: Date.now()
        });
      });
    }
  }

  recordMetric(name: string, value: number, unit: string, metadata?: Record<string, any>) {
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only last 1000 metrics to prevent memory issues
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Log important metrics
    if (value > 1000 || name.includes('error')) {
      console.log(`📊 Metric: ${name} = ${value}${unit}`, metadata);
    }
  }

  recordEvent(event: string, metadata?: Record<string, any>) {
    const userEvent: UserEvent = {
      event,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      metadata
    };

    this.events.push(userEvent);
    
    // Keep only last 500 events
    if (this.events.length > 500) {
      this.events = this.events.slice(-500);
    }

    console.log(`📈 Event: ${event}`, metadata);
  }

  recordConversion(funnel: string, step: string, metadata?: Record<string, any>) {
    const conversion: ConversionEvent = {
      funnel,
      step,
      timestamp: Date.now(),
      deviceId: this.deviceId,
      metadata
    };

    this.conversions.push(conversion);
    
    // Keep only last 200 conversions
    if (this.conversions.length > 200) {
      this.conversions = this.conversions.slice(-200);
    }

    console.log(`🎯 Conversion: ${funnel} -> ${step}`, metadata);
  }

  // Track onboarding funnel
  trackOnboardingStep(step: number, stepName: string, metadata?: Record<string, any>) {
    this.recordConversion('onboarding', `step_${step}_${stepName}`, {
      step,
      stepName,
      ...metadata
    });
  }

  // Track analysis funnel
  trackAnalysisStep(step: string, metadata?: Record<string, any>) {
    this.recordConversion('analysis', step, metadata);
  }

  // Track upgrade funnel
  trackUpgradeStep(step: string, metadata?: Record<string, any>) {
    this.recordConversion('upgrade', step, metadata);
  }

  // Get performance summary
  getPerformanceSummary() {
    const now = Date.now();
    const lastHour = now - (60 * 60 * 1000);
    const lastDay = now - (24 * 60 * 60 * 1000);

    const recentMetrics = this.metrics.filter(m => m.timestamp > lastHour);
    const recentEvents = this.events.filter(e => e.timestamp > lastHour);
    const recentConversions = this.conversions.filter(c => c.timestamp > lastDay);

    return {
      metrics: {
        total: this.metrics.length,
        lastHour: recentMetrics.length,
        averageLoadTime: this.calculateAverage(recentMetrics.filter(m => m.name === 'page_load_time')),
        averageMemoryUsage: this.calculateAverage(recentMetrics.filter(m => m.name === 'memory_used'))
      },
      events: {
        total: this.events.length,
        lastHour: recentEvents.length,
        byType: this.groupBy(recentEvents, 'event')
      },
      conversions: {
        total: this.conversions.length,
        lastDay: recentConversions.length,
        byFunnel: this.groupBy(recentConversions, 'funnel')
      }
    };
  }

  private calculateAverage(metrics: PerformanceMetric[]): number {
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  private groupBy<T>(items: T[], key: keyof T): Record<string, number> {
    return items.reduce((acc, item) => {
      const value = String(item[key]);
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Export data for analytics
  async exportData() {
    return {
      metrics: this.metrics,
      events: this.events,
      conversions: this.conversions,
      summary: this.getPerformanceSummary(),
      exportTimestamp: Date.now()
    };
  }

  // Clear old data
  clearOldData() {
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(m => m.timestamp > oneWeekAgo);
    this.events = this.events.filter(e => e.timestamp > oneWeekAgo);
    this.conversions = this.conversions.filter(c => c.timestamp > oneWeekAgo);
    
    console.log('🧹 Cleared old performance data');
  }
}

// Create singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-initialize when imported
if (typeof window !== 'undefined') {
  performanceMonitor.initialize();
}