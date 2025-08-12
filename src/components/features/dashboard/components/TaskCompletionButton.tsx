/**
 * 🎯 ENTERPRISE TASK COMPLETION BUTTON - PRINCIPAL ENGINEER REFACTOR
 * ==================================================================
 * 
 * Professional task completion component with:
 * - Direct enterprise API integration
 * - Performance-optimized with immediate feedback
 * - Proper AbortController integration
 * - Visual countdown feedback with enhanced UX
 * - Enterprise-grade error handling
 * - SOLID principles implementation
 * 
 * @module TaskCompletionButton
 * @version 3.0.0 - Principal Engineer Implementation
 */

'use client';

import { Check, X, Clock, Square, Loader2, CheckCircle2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useTaskCompletion } from '../hooks/useTaskCompletion';
import { cn } from '@/lib/utils';

/**
 * 🎯 ENTERPRISE: Task Completion Props - Enhanced
 */
interface TaskCompletionButtonProps {
  /** Task ID to complete */
  taskId: string;
  /** Whether the task is already completed */
  isCompleted: boolean;
  /** Legacy task completion handler for backward compatibility */
  onToggleTask?: (taskId: string) => Promise<void>;
  /** Confirmation delay in milliseconds (default: 3000) */
  confirmationDelay?: number;
  /** Optional className for styling */
  className?: string;
  /** Size variant for the button */
  size?: 'sm' | 'default' | 'lg';
  /** Color theme for completed/pending states */
  theme?: 'light' | 'dark';
  /** Task metadata for enhanced UX */
  taskMetadata?: {
    name?: string;
    assigneeId?: string;
    period?: 'daily' | 'weekly' | 'monthly';
  };
  /** Performance optimization settings */
  performanceConfig?: {
    optimisticUpdates?: boolean;
    immediateStateUpdate?: boolean;
    enableRetry?: boolean;
  };
  /** 🎯 ENTERPRISE: Role-based access control */
  disabled?: boolean;
  /** 🎯 ENTERPRISE: Accessibility label for disabled state */
  disabledReason?: string;
  /** 🎯 ENTERPRISE: Show tooltip on disabled state */
  showDisabledTooltip?: boolean;
}

/**
 * 🎯 ENTERPRISE TASK COMPLETION BUTTON - PRINCIPAL ENGINEER IMPLEMENTATION
 * 
 * Implements professional UX pattern with:
 * - Direct enterprise API integration
 * - Visual confirmation timer with abort capability
 * - Performance-optimized immediate feedback
 * - Accessible design with proper ARIA labels
 * - Real-time operation status display
 * 
 * @param props - Enhanced task completion properties
 * @returns Professional task completion component
 */
export function TaskCompletionButton({
  taskId,
  isCompleted,
  onToggleTask,
  confirmationDelay = 3000,
  className = '',
  size = 'sm',
  theme = 'dark',
  taskMetadata = {},
  performanceConfig = {},
  disabled = false,
  disabledReason = 'Insufficient permissions',
  showDisabledTooltip = true
}: TaskCompletionButtonProps) {
  // 🎯 ENTERPRISE: Use enhanced hook with enterprise integration
  const {
    state,
    countdown,
    startCompletion,
    abortCompletion,
    isBusy,
    isConfirming,
    isApiInProgress,
    currentOperation,
    performanceMetrics
  } = useTaskCompletion({
    taskId,
    isCompleted,
    onToggleTask,
    confirmationDelay,
    autoResetDelay: 1000,
    performance: {
      optimisticUpdates: true,
      immediateStateUpdate: true,
      enableRetry: true,
      ...performanceConfig
    },
    taskMetadata
  });

  // 🎯 ENHANCED ICON SELECTION LOGIC with operation status
  const getIcon = () => {
    // 🎯 ENTERPRISE: Show lock icon when disabled
    if (disabled) {
      return <Lock className="h-4 w-4 text-gray-400" />;
    }
    
    switch (state) {
      case 'confirming':
        return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'initiating':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-400" />;
      case 'completed':
        return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      case 'error':
        return <X className="h-4 w-4 text-red-400" />;
      default:
        return isCompleted ? 
          <CheckCircle2 className="h-4 w-4 text-green-400" /> : 
          <Square className="h-4 w-4" />;
    }
  };

  // 🎯 ENHANCED STATUS TEXT for better UX
  const getStatusText = () => {
    switch (state) {
      case 'confirming':
        return `Cancel (${countdown}s)`;
      case 'initiating':
        return 'Getting key...';
      case 'processing':
        switch (currentOperation) {
          case 'initiate': return 'Getting key...';
          case 'confirm': return 'Confirming...';
          case 'state-update': return 'Updating...';
          case 'legacy-toggle': return 'Processing...';
          default: return 'Processing...';
        }
      case 'completed':
        return isCompleted ? 'Incomplete' : 'Complete';
      case 'error':
        return 'Error';
      default:
        return isCompleted ? 'Completed' : 'Complete';
    }
  };

  // 🎯 ENHANCED STYLE VARIANTS with operation awareness
  const getSizeClasses = () => {
    switch (size) {
      case 'lg': return 'h-10 w-10 p-0';
      case 'default': return 'h-8 w-8 p-0';
      default: return 'h-6 w-6 p-0';
    }
  };

  const getThemeClasses = () => {
    const baseClasses = 'transition-all duration-200';
    
    // 🎯 ENTERPRISE: Disabled state styling
    if (disabled) {
      return cn(
        baseClasses,
        'opacity-50 cursor-not-allowed',
        theme === 'light' 
          ? 'text-gray-400 bg-gray-100' 
          : 'text-gray-500 bg-white/10'
      );
    }
    
    if (theme === 'light') {
      return cn(
        baseClasses,
        'text-gray-700 hover:bg-gray-100',
        {
          'bg-green-100 text-green-700 hover:bg-green-200': isCompleted && state === 'idle',
          'bg-yellow-100 text-yellow-700 hover:bg-yellow-200': isConfirming,
          'bg-blue-100 text-blue-700 hover:bg-blue-200': isApiInProgress,
          'animate-pulse': state === 'processing' || state === 'initiating',
        }
      );
    }
    
    return cn(
      baseClasses,
      'text-white hover:bg-white/20',
      {
        'bg-green-500/20 text-green-400 hover:bg-green-500/30': isCompleted && state === 'idle',
        'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30': isConfirming,
        'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30': isApiInProgress,
        'animate-pulse': state === 'processing' || state === 'initiating',
      }
    );
  };

  // 🎯 ENHANCED CONFIRMATION MODE with operation status
  if (isConfirming) {
    return (
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size={size}
          className={`${getSizeClasses()} ${getThemeClasses()} relative ${className}`}
          disabled
          title={`Task completion in progress (${countdown}s remaining) - Operation: ${currentOperation || 'confirming'}`}
        >
          {getIcon()}
          {countdown > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 text-xs bg-yellow-500 text-white rounded-full flex items-center justify-center font-medium">
              {countdown}
            </span>
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-red-400 hover:bg-red-400/20"
          onClick={abortCompletion}
          title="Cancel completion"
          aria-label="Cancel task completion"
        >
          <X className="h-3 w-3" />
        </Button>
        {/* 🎯 DEV: Performance metrics tooltip */}
        {process.env.NODE_ENV === 'development' && performanceMetrics && (
          <div className="hidden group-hover:block absolute top-full left-0 mt-1 p-2 bg-black text-white text-xs rounded shadow-lg z-50">
            {JSON.stringify(performanceMetrics, null, 2)}
          </div>
        )}
      </div>
    );
  }

  // 🎯 ENHANCED STANDARD MODE with better feedback
  const buttonComponent = (
    <div className="relative group">
      <Button
        variant="ghost"
        size={size}
        className={`${getSizeClasses()} ${getThemeClasses()} ${className}`}
        onClick={disabled ? undefined : startCompletion}
        disabled={disabled || (isBusy && !isConfirming)}
        title={
          disabled
            ? disabledReason
            : state === 'error'
              ? 'Task completion failed - click to retry'
              : isCompleted 
                ? 'Mark as incomplete' 
                : isBusy
                  ? `${getStatusText()} - Operation: ${currentOperation || 'processing'}`
                  : 'Mark as complete'
        }
        aria-label={
          disabled
            ? `Disabled: ${disabledReason}`
            : isCompleted 
              ? 'Mark task as incomplete' 
              : isBusy
                ? `Task completion in progress: ${currentOperation || 'processing'}`
                : 'Mark task as complete'
        }
      >
        {getIcon()}
      </Button>
      
      {/* 🎯 DEV: Performance metrics display */}
      {process.env.NODE_ENV === 'development' && performanceMetrics && (
        <div className="hidden group-hover:block absolute bottom-full left-0 mb-1 p-2 bg-black text-white text-xs rounded shadow-lg z-50 whitespace-pre">
          Performance Metrics:{'\n'}
          {JSON.stringify(performanceMetrics, null, 2)}
        </div>
      )}
    </div>
  );

  // 🎯 ENTERPRISE: Wrap with tooltip if disabled and tooltip enabled
  if (disabled && showDisabledTooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {buttonComponent}
          </TooltipTrigger>
          <TooltipContent>
            <p>{disabledReason}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return buttonComponent;
}

/**
 * 🎯 ENTERPRISE: Default export for easy importing
 */
export default TaskCompletionButton;
