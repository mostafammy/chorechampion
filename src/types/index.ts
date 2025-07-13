export type Period = "daily" | "weekly" | "monthly";

export interface Task {
  id: string;
  name: string;
  score: number;
  period: Period;
  completed: boolean;
  assigneeId: string;
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
}

export interface AppProviderProps {
  children: React.ReactNode;
}

export type { Toast } from "@/hooks/use-toast";
