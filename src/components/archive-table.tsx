'use client';

import { ArchivedTask, Member } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

interface ArchiveTableProps {
  archivedTasks: ArchivedTask[];
  members: Member[];
}

export function ArchiveTable({ archivedTasks, members }: ArchiveTableProps) {
  const t = useTranslations('ArchiveTable');
  const tPage = useTranslations('ArchivePage');

  const membersWithTasks = members
    .map((member) => {
      const tasks = archivedTasks
        .filter((task) => task.assigneeId === member.id)
        .sort((a, b) => b.completedDate.getTime() - a.completedDate.getTime());
      return { ...member, tasks };
    })
    .filter((member) => member.tasks.length > 0);

  if (membersWithTasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          {tPage('noTasks')}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {membersWithTasks.map((member) => (
        <Card key={member.id} className="overflow-hidden">
          <CardHeader className="flex flex-row items-center gap-4 p-4 sm:p-6 bg-muted/50">
            <Avatar className="h-12 w-12 border">
              <AvatarImage 
                src={member.avatar} 
                alt={member.name}
                data-ai-hint={member.id === '1' ? 'male portrait' : 'female portrait'}
              />
              <AvatarFallback>{member.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="font-headline text-xl">{member.name}</CardTitle>
              <CardDescription>
                {tPage('tasksCompleted', { count: member.tasks.length })}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-4 sm:pl-6">{t('task')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('period')}</TableHead>
                  <TableHead className="text-center">{t('score')}</TableHead>
                  <TableHead className="text-right pr-4 sm:pr-6">{t('completed')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {member.tasks.map((task) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium pl-4 sm:pl-6">{task.name}</TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Badge variant="outline" className="capitalize">
                        {task.period}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">+{task.score}</Badge>
                    </TableCell>
                    <TableCell className="text-right pr-4 sm:pr-6">
                      <div className="font-medium">
                        {format(task.completedDate, 'MMM d, yyyy')}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {format(task.completedDate, 'p')}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
