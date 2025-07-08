export type Period = 'daily' | 'weekly' | 'monthly';

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
