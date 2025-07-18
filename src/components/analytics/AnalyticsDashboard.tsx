import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Activity, Users, TrendingUp, Zap, Clock, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface AnalyticsData {
  metrics: {
    total: number;
    lastHour: number;
    averageLoadTime: number;
    averageMemoryUsage: number;
  };
  events: {
    total: number;
    lastHour: number;
    byType: Record<string, number>;
  };
  conversions: {
    total: number;
    lastDay: number;
    byFunnel: Record<string, number>;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export const AnalyticsDashboard: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000); // 5 seconds

  useEffect(() => {
    const loadData = async () => {
      try {
        const summary = performanceMonitor.getPerformanceSummary();
        setData(summary as AnalyticsData);
      } catch (error) {
        console.error('Error loading analytics data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();

    // Auto-refresh data
    const interval = setInterval(loadData, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-400">Failed to load analytics data</p>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const eventData = Object.entries(data.events.byType).map(([event, count]) => ({
    name: event,
    value: count
  }));

  const conversionData = Object.entries(data.conversions.byFunnel).map(([funnel, count]) => ({
    name: funnel,
    value: count
  }));

  const performanceData = [
    { name: 'Load Time', value: data.metrics.averageLoadTime },
    { name: 'Memory Usage', value: Math.round(data.metrics.averageMemoryUsage / 1024 / 1024) }, // Convert to MB
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Analytics Dashboard</h1>
          <p className="text-gray-400">Real-time performance and user behavior insights</p>
        </motion.div>

        {/* Key Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Metrics</p>
                <p className="text-2xl font-bold text-white">{data.metrics.total.toLocaleString()}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-2">
              <span className="text-green-400 text-sm">+{data.metrics.lastHour} last hour</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Events</p>
                <p className="text-2xl font-bold text-white">{data.events.total.toLocaleString()}</p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
            <div className="mt-2">
              <span className="text-green-400 text-sm">+{data.events.lastHour} last hour</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Conversions</p>
                <p className="text-2xl font-bold text-white">{data.conversions.total.toLocaleString()}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-orange-500" />
            </div>
            <div className="mt-2">
              <span className="text-green-400 text-sm">+{data.conversions.lastDay} last day</span>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg Load Time</p>
                <p className="text-2xl font-bold text-white">{data.metrics.averageLoadTime.toFixed(0)}ms</p>
              </div>
              <Zap className="w-8 h-8 text-yellow-500" />
            </div>
            <div className="mt-2">
              <span className={`text-sm ${data.metrics.averageLoadTime < 1000 ? 'text-green-400' : 'text-red-400'}`}>
                {data.metrics.averageLoadTime < 1000 ? 'Good' : 'Slow'}
              </span>
            </div>
          </div>
        </motion.div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Event Distribution */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Event Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={eventData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {eventData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Conversion Funnels */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
          >
            <h3 className="text-xl font-semibold text-white mb-4">Conversion Funnels</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={conversionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" fill="#F59E0B" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Performance Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800/50 border border-gray-700 rounded-xl p-6"
        >
          <h3 className="text-xl font-semibold text-white mb-4">Performance Metrics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={performanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px'
                }}
              />
              <Bar dataKey="value" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Health Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h4 className="text-lg font-semibold text-white">Performance</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Load Time</span>
                <span className={`font-medium ${data.metrics.averageLoadTime < 1000 ? 'text-green-400' : 'text-red-400'}`}>
                  {data.metrics.averageLoadTime.toFixed(0)}ms
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Memory Usage</span>
                <span className={`font-medium ${data.metrics.averageMemoryUsage < 50 * 1024 * 1024 ? 'text-green-400' : 'text-red-400'}`}>
                  {Math.round(data.metrics.averageMemoryUsage / 1024 / 1024)}MB
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <TrendingUp className="w-6 h-6 text-blue-500" />
              <h4 className="text-lg font-semibold text-white">Engagement</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Events/Hour</span>
                <span className="text-green-400 font-medium">{data.events.lastHour}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Conversions/Day</span>
                <span className="text-green-400 font-medium">{data.conversions.lastDay}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <div className="flex items-center space-x-3 mb-4">
              <Clock className="w-6 h-6 text-yellow-500" />
              <h4 className="text-lg font-semibold text-white">Activity</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Metrics</span>
                <span className="text-white font-medium">{data.metrics.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Events</span>
                <span className="text-white font-medium">{data.events.total}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="flex justify-center space-x-4"
        >
          <button
            onClick={() => {
              const newInterval = refreshInterval === 5000 ? 10000 : 5000;
              setRefreshInterval(newInterval);
            }}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {refreshInterval === 5000 ? 'Slow Refresh' : 'Fast Refresh'}
          </button>
          
          <button
            onClick={() => {
              performanceMonitor.clearOldData();
              window.location.reload();
            }}
            className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Clear Old Data
          </button>
          
          <button
            onClick={async () => {
              const exportData = await performanceMonitor.exportData();
              const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `analytics-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            Export Data
          </button>
        </motion.div>
      </div>
    </div>
  );
};