'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Filter,
  Search,
  Clock,
  Calendar,
  CheckCircle2,
  Circle,
  AlertCircle,
  Flag,
  User,
  MoreVertical,
  Eye,
  Edit3,
  Trash2,
  PlayCircle,
  PauseCircle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'CANCELLED';

interface Task {
  id: string;
  name: string;
  description: string | null;
  status: TaskStatus;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  project: {
    id: string;
    name: string;
    projectCode: string | null;
    status: string;
  };
}

export default function TasksPage() {
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/employee/tasks');
      const data = await response.json();

      if (data.success) {
        setTasks(data.tasks || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const newStatus = over.id as TaskStatus;

    console.log('Drag ended - taskId:', taskId, 'newStatus:', newStatus, 'type:', typeof newStatus);

    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== newStatus) {
      console.log('Updating task from', task.status, 'to', newStatus);
      updateTaskStatus(taskId, newStatus);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus) => {
    try {
      setUpdatingTaskId(taskId);
      console.log('Sending PATCH request with status:', newStatus);
      const response = await fetch(`/api/employee/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Task status updated successfully');
        // Update task in local state
        setTasks(tasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('Failed to update task:', error);
      toast.error(error.message || 'Failed to update task status');
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    const icons: Record<TaskStatus, React.ReactElement> = {
      TODO: <Circle className="h-4 w-4 text-slate-400" />,
      IN_PROGRESS: <Clock className="h-4 w-4 text-blue-600" />,
      IN_REVIEW: <AlertCircle className="h-4 w-4 text-orange-600" />,
      COMPLETED: <CheckCircle2 className="h-4 w-4 text-green-600" />,
      CANCELLED: <Circle className="h-4 w-4 text-red-600" />,
    };
    return icons[status];
  };

  const statusColumns: { status: TaskStatus; title: string; color: string }[] = [
    { status: 'TODO', title: 'To Do', color: 'border-slate-300' },
    { status: 'IN_PROGRESS', title: 'In Progress', color: 'border-blue-500' },
    { status: 'IN_REVIEW', title: 'In Review', color: 'border-orange-500' },
    { status: 'COMPLETED', title: 'Completed', color: 'border-green-500' },
  ];

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const getRecommendation = (currentStatus: TaskStatus | undefined, targetStatus: TaskStatus) => {
    if (!currentStatus) return null;

    const recommendations: Record<string, { text: string; type: 'success' | 'warning' | 'info' }> = {
      'TODO->IN_PROGRESS': { text: 'Ready to start working? 🚀', type: 'success' },
      'TODO->COMPLETED': { text: '⚠️ Skip to completed? Consider testing first', type: 'warning' },
      'TODO->IN_REVIEW': { text: '⚠️ Nothing to review yet!', type: 'warning' },
      'IN_PROGRESS->IN_REVIEW': { text: 'Submit for review ✅', type: 'success' },
      'IN_PROGRESS->COMPLETED': { text: '⚠️ Consider review before completing', type: 'warning' },
      'IN_PROGRESS->TODO': { text: 'Move back to backlog', type: 'info' },
      'IN_REVIEW->COMPLETED': { text: 'Review passed! Mark complete ✨', type: 'success' },
      'IN_REVIEW->IN_PROGRESS': { text: 'Need more work? Move back', type: 'info' },
      'COMPLETED->IN_PROGRESS': { text: 'Reopen task for more work', type: 'info' },
    };

    return recommendations[`${currentStatus}->${targetStatus}`] || null;
  };

  const DroppableColumn = ({ children, id }: { children: React.ReactNode; id: string }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const recommendation = activeTask ? getRecommendation(activeTask.status, id as TaskStatus) : null;

    return (
      <div
        ref={setNodeRef}
        className={`space-y-3 min-h-[200px] rounded-lg border-2 border-dashed p-2 transition-all ${
          isOver ? 'border-purple-500 bg-purple-50 shadow-lg' : 'border-transparent'
        }`}
      >
        {isOver && recommendation && (
          <div className={`p-3 rounded-lg text-sm font-medium text-center animate-pulse ${
            recommendation.type === 'success' ? 'bg-green-100 text-green-800 border border-green-300' :
            recommendation.type === 'warning' ? 'bg-orange-100 text-orange-800 border border-orange-300' :
            'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {recommendation.text}
          </div>
        )}
        {children}
      </div>
    );
  };

  const DraggableTaskCard = ({ task }: { task: Task }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      isDragging,
    } = useDraggable({ id: task.id });

    const style = {
      transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
        <Card className="hover:shadow-md transition-all cursor-grab active:cursor-grabbing border-l-4 border-l-purple-500">
        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-slate-900 line-clamp-2 flex-1">{task.name}</h4>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'IN_PROGRESS');
                    }}
                    disabled={updatingTaskId === task.id}
                  >
                    <PlayCircle className="h-4 w-4 mr-2 text-blue-600" />
                    Start Working
                  </DropdownMenuItem>
                )}
                {task.status === 'IN_PROGRESS' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'IN_REVIEW');
                    }}
                    disabled={updatingTaskId === task.id}
                  >
                    <PauseCircle className="h-4 w-4 mr-2 text-orange-600" />
                    Submit for Review
                  </DropdownMenuItem>
                )}
                {task.status !== 'COMPLETED' && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      updateTaskStatus(task.id, 'COMPLETED');
                    }}
                    disabled={updatingTaskId === task.id}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Mark as Complete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-slate-600 line-clamp-2">{task.description}</p>
          )}

          {/* Project */}
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>{task.project.name}</span>
            {task.project.projectCode && (
              <Badge variant="outline" className="text-xs">
                {task.project.projectCode}
              </Badge>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t">
            <Badge variant="outline" className="text-xs">
              {task.project.status}
            </Badge>
            {task.dueDate && (
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Calendar className="h-3 w-3" />
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">My Tasks</h1>
        <p className="text-slate-600 mt-1">View and track your assigned tasks</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statusColumns.map((column) => {
          const count = getTasksByStatus(column.status).length;
          return (
            <Card key={column.status} className={`border-l-4 ${column.color}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">{column.title}</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{count}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                    {getStatusIcon(column.status)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('kanban')}
              >
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                List
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        /* Kanban Board */
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {statusColumns.map((column) => {
              const columnTasks = getTasksByStatus(column.status);
              return (
                <div key={column.status} className="space-y-4">
                  {/* Column Header */}
                  <Card className={`border-t-4 ${column.color} bg-slate-50`}>
                    <CardHeader className="p-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          {getStatusIcon(column.status)}
                          {column.title}
                        </CardTitle>
                        <Badge variant="secondary" className="text-xs">
                          {columnTasks.length}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>

                  {/* Tasks - Droppable Zone */}
                  <DroppableColumn id={column.status}>
                    {columnTasks.map((task) => (
                      <DraggableTaskCard key={task.id} task={task} />
                    ))}

                    {columnTasks.length === 0 && !loading && (
                      <Card className="border-dashed">
                        <CardContent className="p-8 text-center">
                          <p className="text-sm text-slate-500">No tasks</p>
                        </CardContent>
                      </Card>
                    )}
                  </DroppableColumn>
                </div>
              );
            })}
          </div>
          <DragOverlay>
            {activeTask ? (
              <Card className="border-l-4 border-l-purple-500 opacity-80 rotate-3 shadow-xl">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-slate-900">{activeTask.name}</h4>
                </CardContent>
              </Card>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        /* List View */
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {tasks.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-slate-500">No tasks assigned yet</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-4"
                  >
                    {/* Status Icon */}
                    <div>{getStatusIcon(task.status)}</div>

                    {/* Task Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-slate-900 truncate">{task.name}</h4>
                      {task.description && (
                        <p className="text-sm text-slate-600 truncate">{task.description}</p>
                      )}
                    </div>

                    {/* Project */}
                    <div className="hidden md:block">
                      <Badge variant="outline" className="text-xs">
                        {task.project.name}
                      </Badge>
                    </div>

                    {/* Status Badge */}
                    <Badge variant="secondary" className="text-xs">
                      {task.status.replace('_', ' ')}
                    </Badge>

                    {/* Due Date */}
                    {task.dueDate && (
                      <div className="flex items-center gap-2 text-sm text-slate-600 min-w-[120px]">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}

                    {/* Actions */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        {task.status !== 'IN_PROGRESS' && task.status !== 'COMPLETED' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTaskStatus(task.id, 'IN_PROGRESS');
                            }}
                            disabled={updatingTaskId === task.id}
                          >
                            <PlayCircle className="h-4 w-4 mr-2 text-blue-600" />
                            Start Working
                          </DropdownMenuItem>
                        )}
                        {task.status === 'IN_PROGRESS' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTaskStatus(task.id, 'IN_REVIEW');
                            }}
                            disabled={updatingTaskId === task.id}
                          >
                            <PauseCircle className="h-4 w-4 mr-2 text-orange-600" />
                            Submit for Review
                          </DropdownMenuItem>
                        )}
                        {task.status !== 'COMPLETED' && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              updateTaskStatus(task.id, 'COMPLETED');
                            }}
                            disabled={updatingTaskId === task.id}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                            Mark as Complete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
