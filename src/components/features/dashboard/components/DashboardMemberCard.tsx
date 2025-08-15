/**
 * ✅ ENTERPRISE DASHBOARD MEMBER CARD COMPONENT
 * 
 * Individual member card component following single responsibility principle.
 * Handles only single member display and interactions.
 * 
 * @module DashboardMemberCard
 * @version 1.0.0
 */

'use client';

import { memo, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { 
  Trophy, 
  Target, 
  Plus, 
  Minus,
  MoreVertical,
  Edit2,
  Settings
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DashboardMemberData, MemberCardGradient } from '../types';
import type { Task } from '@/types';
import { useAppContext } from '@/context/app-provider';
import { useTaskFiltering } from '../hooks/useTaskFiltering';
import { useTaskCompletionPermissions, useScoreAdjustmentPermissions } from '@/components/features/dashboard';
import { CompactTaskFilter } from './TaskFilterTabs';
import { TaskCompletionButton } from './TaskCompletionButton';

/**
 * ✅ ENTERPRISE: Member Card Props
 */
interface DashboardMemberCardProps {
  member: DashboardMemberData;
  gradient: MemberCardGradient;
  onToggleTask: (taskId: string) => Promise<void>;
  onAdjustScore: (memberId: string, delta: number, reason: string) => Promise<void>;
  className?: string;
}

/**
 * 🎯 ENTERPRISE: Score Adjustment Dialog Props
 */
interface ScoreAdjustmentDialogProps {
  member: DashboardMemberData;
  onAdjustScore: (memberId: string, delta: number, reason: string) => Promise<void>;
  scorePermissions: {
    canAdjustScore: boolean;
    disabled: boolean;
    disabledReason: string;
    showTooltip: boolean;
    isAdmin: boolean;
    isLoading: boolean;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * 🎯 ENTERPRISE: Score Adjustment Dialog Component - STABLE IMPLEMENTATION
 * 
 * Moved outside main component to prevent re-creation on every render.
 * This fixes the dialog closing issue when typing in input fields.
 */
const ScoreAdjustmentDialog = memo<ScoreAdjustmentDialogProps>(({ 
  member, 
  onAdjustScore, 
  scorePermissions,
  open: isOpen,
  onOpenChange: handleOpenChange
}) => {
  const t = useTranslations('Dashboard');
  
  // 🎯 STABLE STATE: Local state for dialog inputs only
  const [scoreAdjustment, setScoreAdjustment] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [isAdjusting, setIsAdjusting] = useState(false);

  // 🎯 RESET: Clear form when dialog closes
  const handleDialogClose = (open: boolean) => {
    if (!open) {
      setScoreAdjustment('');
      setAdjustmentReason('');
      setIsAdjusting(false);
    }
    handleOpenChange(open);
  };

  const {
    canAdjustScore,
    disabled,
    disabledReason,
    showTooltip,
    isAdmin,
    isLoading: permissionsLoading
  } = scorePermissions;

  // 🎯 PERFORMANCE: Memoize button state to prevent unnecessary re-renders
  const buttonState = useMemo(() => ({
    disabled: disabled || permissionsLoading,
    tooltip: disabled ? disabledReason : null,
    showTooltip: showTooltip && disabled
  }), [disabled, permissionsLoading, disabledReason, showTooltip]);

  // 🎯 ENTERPRISE: Enhanced error handling for score adjustments
  const handleScoreAdjustmentWithPermissions = async (delta: number) => {
    if (!adjustmentReason.trim()) return;
    
    // 🎯 SECURITY: Double-check permissions before execution
    if (!canAdjustScore) {
      console.warn('[ScoreAdjustment] Permission denied for score adjustment:', {
        memberId: member.id,
        requestedDelta: delta,
        reason: disabledReason
      });
      return;
    }
    
    setIsAdjusting(true);
    try {
      await onAdjustScore(member.id, delta, adjustmentReason);
      // 🎯 SUCCESS: Close dialog using controlled state
      handleDialogClose(false);
    } catch (error) {
      console.error('[ScoreAdjustment] Failed to adjust score:', error);
    } finally {
      setIsAdjusting(false);
    }
  };

  const buttonContent = (
    <Button 
      variant="outline" 
      size="sm" 
      className={`w-full bg-white/10 border-white/20 text-white hover:bg-white/20 ${
        buttonState.disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      disabled={buttonState.disabled}
      title={buttonState.tooltip || undefined}
    >
      <Trophy className="h-4 w-4 mr-2" />
      {t('adjustScore') || 'Adjust Score'}
      {!canAdjustScore && <span className="ml-2 text-xs">(Admin Only)</span>}
    </Button>
  );

  // 🎯 ENTERPRISE: Wrap with tooltip if needed
  const triggerButton = buttonState.showTooltip ? (
    <div title={buttonState.tooltip || ''}>
      {buttonContent}
    </div>
  ) : buttonContent;

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogClose}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('adjustScore') || 'Adjust Score'}
            {!isAdmin && <span className="ml-2 text-sm text-muted-foreground">(Admin Required)</span>}
          </DialogTitle>
          <DialogDescription>
            {canAdjustScore 
              ? (t('adjustScoreDescription') || 'Add or subtract points with a reason')
              : (disabledReason || 'Admin permissions required to adjust scores')
            }
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="scoreAdjustment">{t('pointsAdjustment') || 'Points Adjustment'}</Label>
            <Input
              id="scoreAdjustment"
              type="number"
              placeholder="+10 or -5"
              value={scoreAdjustment}
              onChange={(e) => setScoreAdjustment(e.target.value)}
              disabled={!canAdjustScore}
            />
          </div>
          <div>
            <Label htmlFor="reason">{t('reason') || 'Reason'}</Label>
            <Input
              id="reason"
              placeholder={t('reasonPlaceholder') || 'Why are you adjusting the score?'}
              value={adjustmentReason}
              onChange={(e) => setAdjustmentReason(e.target.value)}
              disabled={!canAdjustScore}
            />
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              disabled={
                !canAdjustScore || 
                !scoreAdjustment || 
                !adjustmentReason.trim() || 
                isAdjusting
              }
              onClick={() => handleScoreAdjustmentWithPermissions(parseInt(scoreAdjustment) || 0)}
              className="flex-1"
            >
              {isAdjusting ? (
                <>{t('applying') || 'Applying...'}</>
              ) : (
                <>
                  {parseInt(scoreAdjustment) > 0 ? <Plus className="h-4 w-4 mr-1" /> : <Minus className="h-4 w-4 mr-1" />}
                  {t('apply') || 'Apply'}
                </>
              )}
            </Button>
          </div>
          
          {/* 🎯 ENTERPRISE: Permission status indicator */}
          {!canAdjustScore && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Trophy className="h-5 w-5 text-amber-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-amber-800">
                    {disabledReason}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
});

ScoreAdjustmentDialog.displayName = 'ScoreAdjustmentDialog';

/**
 * ✅ ENTERPRISE DASHBOARD MEMBER CARD
 * 
 * Single responsibility: Display individual member information and allow interactions.
 * Includes task management, score adjustments, and member details.
 * 
 * @param props Member card properties
 * @returns Member card component
 */
export const DashboardMemberCard = memo<DashboardMemberCardProps>(({ 
  member, 
  gradient, 
  onToggleTask, 
  onAdjustScore, 
  className 
}) => {
  const t = useTranslations('Dashboard');

  // ✅ FIXED CALCULATIONS - Including both active and archived tasks
  const activeTasks = member.tasks.filter(task => !task.completed);
  // ✅ CRITICAL FIX: Get completed tasks from context since member.tasks only contains active tasks
  const { archivedTasks } = useAppContext();
  const memberCompletedTasks = archivedTasks.filter(task => task.assigneeId === member.id);
  const totalMemberTasks = member.tasks.length + memberCompletedTasks.length;
  
  const progressColor = member.completionRate >= 80 ? 'bg-green-500' : 
                       member.completionRate >= 60 ? 'bg-blue-500' : 
                       member.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500';

  // ✅ TASK FILTERING - Enterprise filtering functionality with complete task set
  const allMemberTasks = useMemo(() => [
    ...member.tasks, // Active tasks
    ...memberCompletedTasks // Completed tasks for complete filtering experience
  ], [member.tasks, memberCompletedTasks]);
  
  const taskFiltering = useTaskFiltering(allMemberTasks, {
    // Only using supported options
  });
  const { filterState, utils } = taskFiltering;

  // ✅ ENTERPRISE: Apply real filtering instead of simplified logic
  const filteredTasks = useMemo(() => {
    // Use the actual filtered tasks from the enhanced filtering hook
    const actuallyFilteredTasks = filterState.filteredTasks;
    
    // If no filters are applied and we have many tasks, limit display to recent tasks
    if (!utils.hasActiveFilters && actuallyFilteredTasks.length > 5) {
      // Sort by completion status and limit to 5 most relevant tasks
      return actuallyFilteredTasks
        .sort((a, b) => {
          // Prioritize: incomplete tasks first, then recently completed
          if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
          }
          // For completed tasks, sort by completion date (most recent first)
          if (a.completed && b.completed && a.completedAt && b.completedAt) {
            return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
          }
          // For incomplete tasks, maintain original order
          return 0;
        })
        .slice(0, 5);
    }
    
    return actuallyFilteredTasks;
  }, [filterState.filteredTasks, utils.hasActiveFilters]);

  // 🎯 ENTERPRISE: Score Adjustment Permissions
  const scorePermissions = useScoreAdjustmentPermissions(member.id);

  // 🎯 UI STATE: Dialog management
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);

  // ✅ EVENT HANDLERS
  const handleTaskToggle = async (taskId: string) => {
    try {
      await onToggleTask(taskId);
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  // 🎯 ENTERPRISE: Task Item Component with Role-Based Access Control
  const TaskItem = memo<{ task: Task }>(({ task }) => {
    // 🎯 PERFORMANCE: Get permissions for this specific task
    const { disabled, disabledReason, showTooltip } = useTaskCompletionPermissions(
      task.id,
      task.assigneeId
    );

    return (
      <div 
        key={task.id} 
        className="flex items-center justify-between bg-white/10 rounded p-2"
      >
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <TaskCompletionButton
            taskId={task.id}
            isCompleted={task.completed}
            onToggleTask={handleTaskToggle}
            confirmationDelay={3000}
            size="sm"
            theme="dark"
            className="shrink-0"
            disabled={disabled}
            disabledReason={disabledReason}
            showDisabledTooltip={showTooltip}
            taskMetadata={{
              name: task.name,
              assigneeId: task.assigneeId,
              period: task.period,
            }}
          />
          
          <span className={`text-sm truncate ${
            task.completed ? 'text-white/60 line-through' : 'text-white'
          }`}>
            {task.name}
          </span>
          
          {/* ✅ ENTERPRISE: Task metadata display */}
          {task.completedAt && task.completed && (
            <span className="text-xs text-white/50 ml-2">
              {new Date(task.completedAt).toLocaleDateString()}
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <Badge 
            variant={task.completed ? 'secondary' : 'default'} 
            className="text-xs"
          >
            {task.score}
          </Badge>
          {/* ✅ ENTERPRISE: Period indicator */}
          <Badge 
            variant="outline" 
            className="text-xs text-white/70 border-white/20"
          >
            {task.period.charAt(0).toUpperCase()}
          </Badge>
        </div>
      </div>
    );
  });

  TaskItem.displayName = 'TaskItem';

  return (
    <Card className={`${gradient.className} ${className || ''} transition-all duration-200 hover:shadow-lg`}>
      {/* ✅ MEMBER HEADER */}
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-white/20 text-white font-semibold">
                {member.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="font-semibold text-white">{member.name}</h3>
              <p className="text-sm text-white/80">{t('member') || 'Member'}</p>
            </div>
          </div>
          
          {/* ✅ MEMBER ACTIONS */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Edit2 className="h-4 w-4 mr-2" />
                {t('editMember') || 'Edit Member'}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="h-4 w-4 mr-2" />
                {t('memberSettings') || 'Member Settings'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* ✅ SCORE AND PROGRESS */}
        <div className="bg-white/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-white">
              {t('totalScore') || 'Total Score'}
            </span>
            <span className="text-lg font-bold text-white">
              {member.totalScore}
            </span>
          </div>
          <Progress 
            value={member.completionRate} 
            className={`h-2 bg-white/20 ${progressColor}`}
          />
          <div className="flex justify-between text-xs text-white/80 mt-1">
            <span>{Math.round(member.completionRate)}% {t('complete') || 'complete'}</span>
            <span>{memberCompletedTasks.length} / {totalMemberTasks} {t('tasks') || 'tasks'}</span>
          </div>
        </div>

        {/* ✅ TASK BREAKDOWN */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/10 rounded p-2">
            <div className="text-lg font-bold text-white">{member.taskCounts.daily}</div>
            <div className="text-xs text-white/80">{t('daily') || 'Daily'}</div>
          </div>
          <div className="bg-white/10 rounded p-2">
            <div className="text-lg font-bold text-white">{member.taskCounts.weekly}</div>
            <div className="text-xs text-white/80">{t('weekly') || 'Weekly'}</div>
          </div>
          <div className="bg-white/10 rounded p-2">
            <div className="text-lg font-bold text-white">{member.taskCounts.monthly}</div>
            <div className="text-xs text-white/80">{t('monthly') || 'Monthly'}</div>
          </div>
        </div>

        {/* ✅ FILTERED TASKS WITH ENTERPRISE FILTERING */}
        <div className="space-y-2">
          {/* ✅ SOLUTION: Vertical Stack Layout - Title and Filter on Separate Lines */}
          <div className="space-y-2">
            {/* ✅ HEADER: Task section title with dynamic content */}
            <h4 className="text-sm font-medium text-white flex items-center">
              <Target className="h-4 w-4 mr-1" />
              {utils.hasActiveFilters ? (
                <span>
                  {t('filteredTasks') || 'Filtered Tasks'} 
                  <Badge variant="secondary" className="ml-2 text-xs bg-white/20 text-white">
                    {utils.totalFilteredCount}
                  </Badge>
                  {utils.performanceMetrics.originalTaskCount > utils.totalFilteredCount && (
                    <span className="text-xs text-white/60 ml-1">
                      of {utils.performanceMetrics.originalTaskCount}
                    </span>
                  )}
                </span>
              ) : (
                t('recentTasks') || 'Recent Tasks'
              )}
            </h4>
            
            {/* ✅ FILTER: Ultra-responsive compact task filter optimized for card layout */}
            <div className="w-full">
              <CompactTaskFilter 
                filtering={taskFiltering}
                maxVisibleFilters={2}
                showQuickActions={true}
              />
            </div>
          </div>
          
          {/* ✅ ENTERPRISE: Premium task list with enhanced gradient-aware custom scrollbar */}
          <div className={`space-y-1 max-h-32 overflow-y-auto scrollbar-custom-card ${
            gradient.className.includes('blue') ? 'scrollbar-gradient-blue' :
            gradient.className.includes('purple') || gradient.className.includes('pink') ? 'scrollbar-gradient-purple' :
            gradient.className.includes('emerald') || gradient.className.includes('teal') ? 'scrollbar-gradient-emerald' :
            gradient.className.includes('rose') ? 'scrollbar-gradient-rose' :
            gradient.className.includes('amber') || gradient.className.includes('orange') ? 'scrollbar-gradient-amber' :
            gradient.className.includes('slate') || gradient.className.includes('gray') ? 'scrollbar-gradient-slate' :
            'scrollbar-custom-card'
          }`}>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))
            ) : (
              <div className="text-center py-4 text-white/60">
                <Target className="h-8 w-8 mx-auto mb-2" />
                <p className="text-xs">
                  {utils.hasActiveFilters 
                    ? (t('noTasksMatchFilter') || 'No tasks match current filter')
                    : totalMemberTasks === 0 
                      ? 'No tasks assigned yet'
                      : 'No tasks to display'
                  }
                </p>
                {utils.hasActiveFilters && utils.performanceMetrics.originalTaskCount > 0 && (
                  <p className="text-xs text-white/50 mt-1">
                    {utils.performanceMetrics.originalTaskCount} tasks available ({memberCompletedTasks.length} completed) - try adjusting filters
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ✅ ENTERPRISE SCORE ADJUSTMENT WITH ROLE-BASED ACCESS CONTROL */}
        <ScoreAdjustmentDialog 
          member={member}
          scorePermissions={scorePermissions}
          onAdjustScore={onAdjustScore}
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
        />
      </CardContent>
    </Card>
  );
});

DashboardMemberCard.displayName = 'DashboardMemberCard';
