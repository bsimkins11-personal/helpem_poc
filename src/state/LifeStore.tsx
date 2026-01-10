"use client";

import { createContext, useContext, useState } from "react";
import { Todo } from "@/types/todo";
import { Habit } from "@/types/habit";
import { Appointment } from "@/types/appointment";

// Helper to create dates relative to today
const daysFromNow = (days: number, hour: number = 9, minute: number = 0): Date => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
};

const today = new Date();
today.setHours(0, 0, 0, 0);

// Seed data
const seedAppointments: Appointment[] = [
  {
    id: "apt-1",
    title: "Morning standup",
    datetime: daysFromNow(0, 9, 30),
    createdAt: new Date(),
  },
  {
    id: "apt-2",
    title: "Dentist checkup",
    datetime: daysFromNow(3, 14, 0),
    createdAt: new Date(),
  },
  {
    id: "apt-3",
    title: "Doctor - annual physical",
    datetime: daysFromNow(7, 10, 0),
    createdAt: new Date(),
  },
  {
    id: "apt-4",
    title: "Team lunch",
    datetime: daysFromNow(1, 12, 30),
    createdAt: new Date(),
  },
  {
    id: "apt-5",
    title: "Valentine's Day dinner",
    datetime: new Date(2026, 1, 14, 19, 0),
    createdAt: new Date(),
  },
  {
    id: "apt-6",
    title: "Tax deadline",
    datetime: new Date(2026, 3, 15, 17, 0),
    createdAt: new Date(),
  },
  {
    id: "apt-7",
    title: "Mom's birthday",
    datetime: new Date(2026, 2, 20, 18, 0),
    createdAt: new Date(),
  },
  {
    id: "apt-8",
    title: "Car service appointment",
    datetime: daysFromNow(5, 8, 0),
    createdAt: new Date(),
  },
];

const seedTodos: Todo[] = [
  {
    id: "todo-1",
    title: "Pick up prescription",
    dueDate: daysFromNow(0),
    createdAt: new Date(),
  },
  {
    id: "todo-2",
    title: "Book flight for conference",
    dueDate: daysFromNow(2),
    createdAt: new Date(),
  },
  {
    id: "todo-3",
    title: "Renew gym membership",
    dueDate: daysFromNow(5),
    createdAt: new Date(),
  },
  {
    id: "todo-4",
    title: "Buy groceries",
    createdAt: new Date(),
  },
  {
    id: "todo-5",
    title: "Schedule B12 shot",
    dueDate: daysFromNow(1),
    createdAt: new Date(),
  },
  {
    id: "todo-6",
    title: "Order new vitamins",
    createdAt: new Date(),
  },
  {
    id: "todo-7",
    title: "Call insurance about claim",
    dueDate: daysFromNow(0),
    createdAt: new Date(),
  },
  {
    id: "todo-8",
    title: "Update emergency contacts",
    createdAt: new Date(),
  },
];

const seedHabits: Habit[] = [
  {
    id: "habit-1",
    title: "Take daily vitamins",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-3) },
      { date: daysFromNow(-2) },
      { date: daysFromNow(-1) },
    ],
  },
  {
    id: "habit-2",
    title: "Morning workout",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-2) },
      { date: daysFromNow(-1) },
    ],
  },
  {
    id: "habit-3",
    title: "Drink 8 glasses of water",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-1) },
    ],
  },
  {
    id: "habit-4",
    title: "10 min meditation",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-4) },
      { date: daysFromNow(-3) },
      { date: daysFromNow(-2) },
      { date: daysFromNow(-1) },
    ],
  },
  {
    id: "habit-5",
    title: "Read for 30 minutes",
    frequency: "daily",
    createdAt: new Date(),
    completions: [],
  },
  {
    id: "habit-6",
    title: "Weekly meal prep",
    frequency: "weekly",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-7) },
    ],
  },
  {
    id: "habit-7",
    title: "B12 injection",
    frequency: "weekly",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-7) },
    ],
  },
];

type LifeContextType = {
  todos: Todo[];
  habits: Habit[];
  appointments: Appointment[];
  addTodo: (todo: Todo) => void;
  completeTodo: (id: string) => void;
  addHabit: (habit: Habit) => void;
  logHabit: (id: string) => void;
  addAppointment: (appt: Appointment) => void;
};

const LifeContext = createContext<LifeContextType | null>(null);

export function LifeProvider({ children }: { children: React.ReactNode }) {
  const [todos, setTodos] = useState<Todo[]>(seedTodos);
  const [habits, setHabits] = useState<Habit[]>(seedHabits);
  const [appointments, setAppointments] = useState<Appointment[]>(seedAppointments);

  const addTodo = (todo: Todo) => setTodos(prev => [...prev, todo]);

  const completeTodo = (id: string) =>
    setTodos(prev =>
      prev.map(t =>
        t.id === id ? { ...t, completedAt: new Date() } : t
      )
    );

  const addHabit = (habit: Habit) =>
    setHabits(prev => [...prev, habit]);

  const logHabit = (id: string) =>
    setHabits(prev =>
      prev.map(h =>
        h.id === id
          ? { ...h, completions: [...h.completions, { date: new Date() }] }
          : h
      )
    );

  const addAppointment = (appt: Appointment) =>
    setAppointments(prev => [...prev, appt]);

  return (
    <LifeContext.Provider
      value={{
        todos,
        habits,
        appointments,
        addTodo,
        completeTodo,
        addHabit,
        logHabit,
        addAppointment,
      }}
    >
      {children}
    </LifeContext.Provider>
  );
}

export const useLife = () => {
  const ctx = useContext(LifeContext);
  if (!ctx) throw new Error("useLife must be used inside LifeProvider");
  return ctx;
};
