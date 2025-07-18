import { supabase } from '@/integrations/supabase/client';
import { persistenceManager } from './persistenceManager';
import { performanceMonitor } from './performanceMonitor';
import Logger from './logger';

export interface HealthCheckResult {
  isHealthy: boolean;
  checks: {
    database: boolean;
    auth: boolean;
    storage: boolean;
    performance: boolean;
    memory: boolean;
  };
  issues: string[];
  recommendations: string[];
  timestamp: number;
}

export interface DatabaseHealth {
  isConnected: boolean;
  responseTime: number;
  error?: string;
}

export interface AuthHealth {
  isWorking: boolean;
  sessionValid: boolean;
  error?: string;
}

export interface StorageHealth {
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  error?: string;
}

class HealthChecker {
  private static instance: HealthChecker;
  private lastCheck: number = 0;
  private checkInterval: number = 30000; // 30 seconds
  private _lastResult: HealthCheckResult | null = null;
  private _intervalId: NodeJS.Timeout | null = null;

  private constructor() {}

  static getInstance(): HealthChecker {
    if (!HealthChecker.instance) {
      HealthChecker.instance = new HealthChecker();
    }
    return HealthChecker.instance;
  }

  async checkDatabase(): Promise<DatabaseHealth> {
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('count')
        .limit(1);

      const responseTime = performance.now() - startTime;

      if (error) {
        return {
          isConnected: false,
          responseTime,
          error: error.message
        };
      }

      return {
        isConnected: true,
        responseTime
      };
    } catch (error) {
      return {
        isConnected: false,
        responseTime: performance.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async checkAuth(): Promise<AuthHealth> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        return {
          isWorking: false,
          sessionValid: false,
          error: error.message
        };
      }

      return {
        isWorking: true,
        sessionValid: !!session
      };
    } catch (error) {
      return {
        isWorking: false,
        sessionValid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  checkStorage(): StorageHealth {
    const result: StorageHealth = {
      localStorage: false,
      sessionStorage: false,
      indexedDB: false
    };

    try {
      // Test localStorage
      const testKey = '__health_check__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      result.localStorage = true;
    } catch (error) {
      result.error = `localStorage failed: ${error}`;
    }

    try {
      // Test sessionStorage
      const testKey = '__health_check__';
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      result.sessionStorage = true;
    } catch (error) {
      result.error = `${result.error || ''}; sessionStorage failed: ${error}`;
    }

    try {
      // Test IndexedDB
      if ('indexedDB' in window) {
        result.indexedDB = true;
      }
    } catch (error) {
      result.error = `${result.error || ''}; IndexedDB failed: ${error}`;
    }

    return result;
  }

  checkPerformance(): boolean {
    const report = performanceMonitor.getReport();
    const hasSlowOperations = report.slowOperations.length > 0;
    const hasErrors = report.errors.length > 0;
    
    if (hasSlowOperations || hasErrors) {
      Logger.warn('Performance issues detected:', {
        slowOperations: report.slowOperations.length,
        errors: report.errors.length
      });
      return false;
    }
    
    return true;
  }

  checkMemory(): boolean {
    if ('memory' in performance) {
      const memory = (performance as Performance & {
        memory: {
          usedJSHeapSize: number;
          jsHeapSizeLimit: number;
        };
      }).memory;
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      
      if (usagePercentage > 80) {
        Logger.warn('High memory usage detected:', {
          usagePercentage: usagePercentage.toFixed(2) + '%',
          used: memory.usedJSHeapSize,
          limit: memory.jsHeapSizeLimit
        });
        return false;
      }
    }
    
    return true;
  }

  async performHealthCheck(): Promise<HealthCheckResult> {
    const now = Date.now();
    
    // Prevent too frequent checks
    if (now - this.lastCheck < this.checkInterval) {
      return this.getLastResult();
    }
    
    this.lastCheck = now;

    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check database
    const dbHealth = await this.checkDatabase();
    if (!dbHealth.isConnected) {
      issues.push(`Database connection failed: ${dbHealth.error}`);
      recommendations.push('Check your internet connection and try again');
    } else if (dbHealth.responseTime > 2000) {
      issues.push(`Database response time is slow: ${dbHealth.responseTime.toFixed(0)}ms`);
      recommendations.push('Database may be experiencing high load');
    }

    // Check auth
    const authHealth = await this.checkAuth();
    if (!authHealth.isWorking) {
      issues.push(`Authentication service failed: ${authHealth.error}`);
      recommendations.push('Authentication service may be down');
    }

    // Check storage
    const storageHealth = this.checkStorage();
    if (!storageHealth.localStorage || !storageHealth.sessionStorage) {
      issues.push(`Storage access failed: ${storageHealth.error}`);
      recommendations.push('Browser storage may be disabled or full');
    }

    // Check performance
    const performanceHealthy = this.checkPerformance();
    if (!performanceHealthy) {
      issues.push('Performance issues detected');
      recommendations.push('Consider refreshing the page');
    }

    // Check memory
    const memoryHealthy = this.checkMemory();
    if (!memoryHealthy) {
      issues.push('High memory usage detected');
      recommendations.push('Consider closing other tabs or refreshing');
    }

    const result: HealthCheckResult = {
      isHealthy: issues.length === 0,
      checks: {
        database: dbHealth.isConnected,
        auth: authHealth.isWorking,
        storage: storageHealth.localStorage && storageHealth.sessionStorage,
        performance: performanceHealthy,
        memory: memoryHealthy
      },
      issues,
      recommendations,
      timestamp: now
    };

    // Log health status
    if (!result.isHealthy) {
      Logger.warn('Health check failed:', result);
    } else {
      Logger.info('Health check passed');
    }

    this._lastResult = result;
    return result;
  }

  private getLastResult(): HealthCheckResult {
    return this._lastResult || {
      isHealthy: true,
      checks: {
        database: true,
        auth: true,
        storage: true,
        performance: true,
        memory: true
      },
      issues: [],
      recommendations: [],
      timestamp: this.lastCheck
    };
  }

  // Start periodic health checks
  startPeriodicChecks(): void {
    if (this._intervalId) clearInterval(this._intervalId);
    this._intervalId = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        Logger.error('Health check failed:', error);
      }
    }, this.checkInterval);
  }

  stopPeriodicChecks(): void {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  // Emergency health check (bypasses frequency limit)
  async emergencyCheck(): Promise<HealthCheckResult> {
    this.lastCheck = 0; // Reset last check time
    return this.performHealthCheck();
  }
}

export const healthChecker = HealthChecker.getInstance();

// Start periodic health checks
if (typeof window !== 'undefined') {
  // Start after a delay to avoid interfering with app initialization
  setTimeout(() => {
    healthChecker.startPeriodicChecks();
  }, 10000);
}