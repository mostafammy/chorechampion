/**
 * Debug component to check what data is available in the app context
 */

'use client';

import { useAppContext } from '@/context/app-provider';

export function DebugArchiveData() {
  const { archivedTasks, members } = useAppContext();

  console.log('=== DEBUG ARCHIVE DATA ===');
  console.log('Archived tasks count:', archivedTasks.length);
  console.log('Members count:', members.length);
  console.log('Archived tasks:', archivedTasks);
  console.log('Members:', members);

  // Check for today's tasks specifically
  const today = new Date();
  const todayString = today.toDateString();
  
  const todayTasks = archivedTasks.filter(task => {
    const completedDate = new Date(task.completedDate);
    return completedDate.toDateString() === todayString;
  });

  console.log('Today\'s tasks found:', todayTasks.length);
  console.log('Today\'s tasks:', todayTasks);

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 m-4">
      <h3 className="text-lg font-semibold mb-2">Archive Data Debug</h3>
      <p><strong>Archived Tasks:</strong> {archivedTasks.length}</p>
      <p><strong>Members:</strong> {members.length}</p>
      <p><strong>Today's Tasks:</strong> {todayTasks.length}</p>
      
      {archivedTasks.length === 0 && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-red-800 font-medium">⚠️ No archived tasks found!</p>
          <p className="text-red-600 text-sm">This could be why today's tasks aren't showing.</p>
        </div>
      )}
      
      {todayTasks.length === 0 && archivedTasks.length > 0 && (
        <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
          <p className="text-orange-800 font-medium">⚠️ No tasks completed today!</p>
          <p className="text-orange-600 text-sm">All archived tasks are from other dates.</p>
        </div>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer font-medium">View Raw Data</summary>
        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-auto max-h-40">
          {JSON.stringify({ archivedTasks, members }, null, 2)}
        </pre>
      </details>
    </div>
  );
}
