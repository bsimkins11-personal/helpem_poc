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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-2">
          <span className="w-10 h-10 rounded-xl bg-brandBlueLight flex items-center justify-center text-brandBlue text-xl">✓</span>
          <h1 className="text-2xl font-bold text-brandText">Todos</h1>
        </div>
        <p className="text-brandTextLight">
          {stats.active} active · {stats.high} high priority · {stats.completed} completed
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex gap-2">
            {(['all', 'active', 'completed'] as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                  ${
                    filter === f
                      ? 'bg-brandBlue text-white'
                      : 'text-brandTextLight hover:text-brandText hover:bg-gray-100'
                  }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortType)}
            className="px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm
                       text-brandText focus:outline-none focus:ring-2 focus:ring-brandBlue/50"
          >
            <option value="priority">Priority</option>
            <option value="dueDate">Due Date</option>
            <option value="created">Recently Created</option>
          </select>
        </div>
      </div>

      {/* Todo List */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        {sortedTodos.length > 0 ? (
          <div className="space-y-3">
            {sortedTodos.map((todo) => (
              <TodoCard key={todo.id} todo={todo} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <div className="text-4xl mb-4">✓</div>
            <p className="text-brandTextLight">
              {filter === 'all'
                ? 'No todos yet. Go capture some tasks!'
                : filter === 'active'
                ? 'All caught up! No active todos.'
                : 'No completed todos yet.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
