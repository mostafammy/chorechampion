import { signupSchema } from "@/schemas/auth/signup.schema";
import { z } from "zod";
import React from "react";
import { loginSchema } from "@/schemas/auth/login.schema";

export type Period = "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  name: string;
  score: number;
  period: Period;
  completed: boolean;
  assigneeId: string;
}

export interface ScoreSummary {
  total: number;
  adjustment: number;
  completed: number;
  last_adjusted_at?: string;
}

export interface ScoreLogEntry {
  delta: number;
  reason: string;
  source: "manual" | "task" | "bonus" | "admin";
  userId: string;
  taskId?: string;
  at: string; // ISO date string
}

export interface AdjustScoreInput {
  userId: string;
  delta: number;
  reason?: string;
  source: "manual" | "task" | "bonus" | "admin";
  taskId?: string | null;
}

export interface Member {
  id: string;
  name: string;
  avatar?: string;
}

export interface ArchivedTask extends Task {
  completedDate: Date;
}

export interface AddTaskRequest {
  name: string;
  score: number;
  assigneeId: string;
  period: Period;
}

export interface ConfirmCompletionRequest {
  completionKey: string;
}

export interface InitiateCompletionRequest {
  taskId: string;
}

export interface AppContextType {
  members: Member[];
  activeTasks: Task[];
  archivedTasks: ArchivedTask[];
  scoreAdjustments: Record<string, number>;
  handleAddTask: (task: Task) => void;
  handleToggleTask: (taskId: string) => void;
  handleAdjustScore: (memberId: string, amount: number) => void;
  auth: {
    isAuthenticated: boolean | null;
    isLoading: boolean;
    checkAuthStatus: () => Promise<void>;
    refreshTokens: () => Promise<boolean>;
    startBackgroundMonitoring: () => void;
    stopBackgroundMonitoring: () => void;
    userRole: "ADMIN" | "USER" | null; // ✅ ADD: User role for instant access
    isAdmin: boolean; // ✅ ADD: Admin status for quick checks
  };
}

export interface AppProviderProps {
  children: React.ReactNode;
}

export type { Toast } from "@/hooks/use-toast";

export type SignupInputType = z.infer<typeof signupSchema>;
export type LoginInputType = z.infer<typeof loginSchema>;

export interface JwtPayload {
  id: string;
  role: string;
  email: string;
  iat?: number;
  exp?: number;
}
