'use client';

import { useState } from 'react';
import { TodoCard } from '@/components/TodoCard';
import { useLife } from '@/state/LifeStore';

type FilterType = 'all' | 'active' | 'completed';
type SortType = 'priority' | 'created' | 'dueDate';

const priorityOrder = { high: 0, medium: 1, low: 2 };

export default function TodosPage() {
  const { todos } = useLife();
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('priority');

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completedAt;
    if (filter === 'completed') return !!todo.completedAt;
    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sort === 'priority') {
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }
    if (sort === 'dueDate') {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completedAt).length,
    completed: todos.filter((t) => !!t.completedAt).length,
    high: todos.filter((t) => !t.completedAt && t.priority === 'high').length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3">
          <span className="text-[#0077CC]">✓</span>
          Todos
        </h1>
        <p className="text-white/50">
          {stats.active} active · {stats.high} high priority · {stats.completed} completed
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                ${
                  filter === f
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortType)}
          className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm
                     text-white/70 focus:outline-none focus:ring-2 focus:ring-[#0077CC]/50"
        >
          <option value="priority">Priority</option>
          <option value="dueDate">Due Date</option>
          <option value="created">Recently Created</option>
        </select>
      </div>

      {/* Todo List */}
      {sortedTodos.length > 0 ? (
        <div className="space-y-3">
          {sortedTodos.map((todo) => (
            <TodoCard key={todo.id} todo={todo} />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center border border-dashed border-white/10 rounded-xl">
          <div className="text-4xl mb-4">✓</div>
          <p className="text-white/40">
            {filter === 'all'
              ? 'No todos yet. Go capture some tasks!'
              : filter === 'active'
              ? 'All caught up! No active todos.'
              : 'No completed todos yet.'}
          </p>
        </div>
      )}
    </div>
  );
}
