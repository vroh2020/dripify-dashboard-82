import Logger from './logger';

export interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface PerformanceReport {
  metrics: PerformanceMetric[];
  totalDuration: number;
  slowOperations: PerformanceMetric[];
  errors: string[];
  timestamp: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric> = new Map();
  private errors: string[] = [];
  private isEnabled: boolean = true;
  private slowThreshold: number = 1000; // 1 second

  private constructor() {
    // Monitor for memory leaks
    if (typeof window !== 'undefined') {
      this.monitorMemoryUsage();
      this.monitorLongTasks();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      metadata
    };

    this.metrics.set(name, metric);
  }

  endTiming(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric '${name}' not found`);
      return null;
    }

    metric.endTime = performance.now();
    metric.duration = metric.endTime - metric.startTime;

    // Log slow operations
    if (metric.duration > this.slowThreshold) {
      Logger.warn('Slow operation detected:', {
        name,
        duration: metric.duration,
        metadata: metric.metadata
      });
    }

    return metric.duration;
  }

  mark(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    const metric: PerformanceMetric = {
      name,
      startTime: performance.now(),
      endTime: performance.now(),
      duration: 0,
      metadata
    };

    this.metrics.set(name, metric);
  }

  measure(name: string, fn: () => void | Promise<void>): void | Promise<void> {
    this.startTiming(name);
    
    try {
      const result = fn();
      if (result instanceof Promise) {
        return result.finally(() => this.endTiming(name));
      } else {
        this.endTiming(name);
        return result;
      }
    } catch (error) {
      this.endTiming(name);
      this.recordError(`Error in ${name}: ${error}`);
      throw error;
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    this.startTiming(name);
    
    try {
      const result = await fn();
      this.endTiming(name);
      return result;
    } catch (error) {
      this.endTiming(name);
      this.recordError(`Error in ${name}: ${error}`);
      throw error;
    }
  }

  recordError(error: string): void {
    this.errors.push(error);
    Logger.error('Performance error:', error);
  }

  getReport(): PerformanceReport {
    const metrics = Array.from(this.metrics.values());
    const slowOperations = metrics.filter(m => m.duration && m.duration > this.slowThreshold);
    const totalDuration = metrics.reduce((sum, m) => sum + (m.duration || 0), 0);

    return {
      metrics,
      totalDuration,
      slowOperations,
      errors: [...this.errors],
      timestamp: Date.now()
    };
  }

  clear(): void {
    this.metrics.clear();
    this.errors = [];
  }

  private monitorMemoryUsage(): void {
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
          Logger.warn('High memory usage detected:', {
            used: memory.usedJSHeapSize,
            total: memory.totalJSHeapSize,
            limit: memory.jsHeapSizeLimit
          });
        }
      }, 30000); // Check every 30 seconds
    }
  }

  private monitorLongTasks(): void {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // 50ms threshold
              Logger.warn('Long task detected:', {
                name: entry.name,
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          }
        });

        observer.observe({ entryTypes: ['longtask'] });
      } catch (error) {
        console.warn('PerformanceObserver not supported:', error);
      }
    }
  }

  // Monitor React render performance
  monitorReactRenders(componentName: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      if (duration > 16) { // 16ms = 60fps threshold
        Logger.warn('Slow React render detected:', {
          component: componentName,
          duration
        });
      }
    };
  }

  // Monitor network requests
  monitorNetworkRequest(url: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      if (duration > 5000) { // 5 second threshold
        Logger.warn('Slow network request detected:', {
          url,
          duration
        });
      }
    };
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();

// Global performance monitoring
if (typeof window !== 'undefined') {
  (window as any).performanceMonitor = performanceMonitor;
  
  // Monitor unhandled errors
  window.addEventListener('error', (event) => {
    performanceMonitor.recordError(`Unhandled error: ${event.error?.message || event.message}`);
  });

  // Monitor unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    performanceMonitor.recordError(`Unhandled promise rejection: ${event.reason}`);
  });
}