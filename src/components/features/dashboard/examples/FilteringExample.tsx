/**
 * ✅ ENTERPRISE FILTERING DEMONSTRATION
 * 
 * Principal Engineer example demonstrating the enhanced filtering capabilities.
 * This file shows how the enterprise-grade filtering system works with real data.
 * 
 * @module FilteringExample
 * @version 1.0.0
 */

'use client';

import { useState, useMemo } from 'react';
import type { Task } from '@/types';
import { useTaskFiltering } from '../hooks/useTaskFiltering';
import { TaskFilterTabs } from '../components/TaskFilterTabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Database, Zap } from 'lucide-react';

/**
 * ✅ SAMPLE DATA GENERATOR
 * 
 * Generates realistic task data for testing the filtering system
 */
const generateSampleTasks = (): Task[] => {
  const tasks: Task[] = [];
  const taskNames = [
    'Clean Kitchen', 'Do Laundry', 'Vacuum Living Room', 'Wash Dishes',
    'Take Out Trash', 'Mow Lawn', 'Organize Garage', 'Water Plants',
    'Clean Bathroom', 'Dust Furniture', 'Prepare Meals', 'Walk Dog'
  ];

  const periods: Array<'daily' | 'weekly' | 'monthly'> = ['daily', 'weekly', 'monthly'];
  const now = new Date();

  for (let i = 0; i < 20; i++) {
    const isCompleted = Math.random() > 0.4; // 60% completion rate
    const period = periods[Math.floor(Math.random() * periods.length)];
    
    // Generate completion date based on period
    let completedAt: string | undefined;
    if (isCompleted) {
      const daysAgo = period === 'daily' ? Math.random() * 1 : 
                     period === 'weekly' ? Math.random() * 7 : 
                     Math.random() * 30;
      
      const completionDate = new Date(now);
      completionDate.setDate(now.getDate() - Math.floor(daysAgo));
      completedAt = completionDate.toISOString();
    }

    tasks.push({
      id: `task-${i}`,
      name: taskNames[i % taskNames.length] + (i > 11 ? ` #${Math.floor(i/12)}` : ''),
      score: Math.floor(Math.random() * 50) + 10,
      period,
      completed: isCompleted,
      assigneeId: 'user-1',
      completedAt,
      completedBy: isCompleted ? 'user-1' : undefined,
    });
  }

  return tasks;
};

/**
 * ✅ ENTERPRISE FILTERING EXAMPLE COMPONENT
 */
export const FilteringExample = () => {
  const [tasks, setTasks] = useState<Task[]>(() => generateSampleTasks());
  const [performanceMode, setPerformanceMode] = useState(false);

  // ✅ ENTERPRISE FILTERING HOOK
  const filtering = useTaskFiltering(tasks, {
    enablePerformanceLogging: performanceMode
  });

  const { filterState, utils } = filtering;

  // ✅ PERFORMANCE METRICS
  const performanceMetrics = useMemo(() => {
    const start = performance.now();
    const filtered = filterState.filteredTasks;
    const end = performance.now();

    return {
      filterTime: end - start,
      originalCount: tasks.length,
      filteredCount: filtered.length,
      efficiency: utils.performanceMetrics.filterEfficiency,
    };
  }, [filterState.filteredTasks, tasks.length, utils.performanceMetrics.filterEfficiency]);

  const regenerateTasks = () => {
    setTasks(generateSampleTasks());
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="h-5 w-5" />
            <span>Enterprise Task Filtering System</span>
            <Badge variant="secondary">Principal Engineer Implementation</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* ✅ CONTROLS */}
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button onClick={regenerateTasks} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate New Data
              </Button>
              <Button 
                onClick={() => setPerformanceMode(!performanceMode)}
                variant={performanceMode ? "default" : "outline"}
                size="sm"
              >
                <Zap className="h-4 w-4 mr-2" />
                Performance Mode
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              {tasks.length} total tasks loaded
            </div>
          </div>

          {/* ✅ FILTERING INTERFACE */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filter Controls */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold mb-4">Filter Controls</h3>
              <TaskFilterTabs 
                filtering={filtering}
                showStats={true}
                showPerformanceMetrics={performanceMode}
                enableRealTimeFeedback={true}
              />
            </div>

            {/* Results Display */}
            <div className="lg:col-span-2">
              <h3 className="text-lg font-semibold mb-4">
                Filtered Results 
                <Badge className="ml-2">{filterState.filteredTasks.length} tasks</Badge>
              </h3>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filterState.filteredTasks.map(task => (
                  <div 
                    key={task.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        task.completed ? 'bg-green-500' : 'bg-blue-500'
                      }`} />
                      <div>
                        <div className={task.completed ? 'line-through text-muted-foreground' : ''}>
                          {task.name}
                        </div>
                        {task.completedAt && (
                          <div className="text-xs text-muted-foreground">
                            Completed: {new Date(task.completedAt).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline">{task.period}</Badge>
                      <Badge>{task.score} pts</Badge>
                    </div>
                  </div>
                ))}
                
                {filterState.filteredTasks.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks match the current filter</p>
                    <p className="text-sm mt-2">
                      Try adjusting the filter settings or generating new data
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ✅ PERFORMANCE METRICS */}
          {performanceMode && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-medium">Filter Time</div>
                    <div className="text-muted-foreground">
                      {performanceMetrics.filterTime.toFixed(2)}ms
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Original Tasks</div>
                    <div className="text-muted-foreground">
                      {performanceMetrics.originalCount}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Filtered Tasks</div>
                    <div className="text-muted-foreground">
                      {performanceMetrics.filteredCount}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium">Efficiency</div>
                    <div className="text-muted-foreground">
                      {performanceMetrics.efficiency.toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ TECHNICAL SUMMARY */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Enterprise Features Implemented</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-medium mb-2">Architecture & Design</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• SOLID Principles implementation</li>
                    <li>• Single Responsibility classes</li>
                    <li>• Dependency Inversion pattern</li>
                    <li>• Type-safe operations</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Performance & UX</h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>• Date-aware period filtering</li>
                    <li>• Memoized calculations</li>
                    <li>• Real-time feedback</li>
                    <li>• Smart recommendations</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default FilteringExample;
