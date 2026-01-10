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

// Seed data
const seedAppointments: Appointment[] = [
  // Today
  { id: "apt-1", title: "Morning standup", datetime: daysFromNow(0, 9, 30), createdAt: new Date() },
  { id: "apt-2", title: "Coffee with Sarah", datetime: daysFromNow(0, 11, 0), createdAt: new Date() },
  { id: "apt-3", title: "Lunch with mentor", datetime: daysFromNow(0, 12, 30), createdAt: new Date() },
  
  // This week
  { id: "apt-4", title: "Team lunch", datetime: daysFromNow(1, 12, 30), createdAt: new Date() },
  { id: "apt-5", title: "Call with Mike about project", datetime: daysFromNow(1, 15, 0), createdAt: new Date() },
  { id: "apt-6", title: "Dentist checkup", datetime: daysFromNow(3, 14, 0), createdAt: new Date() },
  { id: "apt-7", title: "Networking event downtown", datetime: daysFromNow(4, 18, 0), createdAt: new Date() },
  { id: "apt-8", title: "Car service appointment", datetime: daysFromNow(5, 8, 0), createdAt: new Date() },
  
  // Travel
  { id: "apt-9", title: "Flight to Austin - SFO → AUS", datetime: daysFromNow(10, 7, 30), createdAt: new Date() },
  { id: "apt-10", title: "SXSW Conference - Day 1", datetime: daysFromNow(10, 10, 0), createdAt: new Date() },
  { id: "apt-11", title: "Dinner with Austin team", datetime: daysFromNow(10, 19, 0), createdAt: new Date() },
  { id: "apt-12", title: "SXSW Conference - Day 2", datetime: daysFromNow(11, 9, 0), createdAt: new Date() },
  { id: "apt-13", title: "Flight home - AUS → SFO", datetime: daysFromNow(12, 16, 0), createdAt: new Date() },
  
  // People
  { id: "apt-14", title: "1:1 with manager", datetime: daysFromNow(2, 10, 0), createdAt: new Date() },
  { id: "apt-15", title: "Catch up call with college friend", datetime: daysFromNow(6, 17, 0), createdAt: new Date() },
  { id: "apt-16", title: "Interview - Product Designer", datetime: daysFromNow(3, 11, 0), createdAt: new Date() },
  
  // Health
  { id: "apt-17", title: "Doctor - annual physical", datetime: daysFromNow(7, 10, 0), createdAt: new Date() },
  { id: "apt-18", title: "Physical therapy session", datetime: daysFromNow(2, 16, 0), createdAt: new Date() },
  
  // Holidays & Personal
  { id: "apt-19", title: "Valentine's Day dinner", datetime: new Date(2026, 1, 14, 19, 0), createdAt: new Date() },
  { id: "apt-20", title: "Mom's birthday", datetime: new Date(2026, 2, 20, 18, 0), createdAt: new Date() },
  { id: "apt-21", title: "Tax deadline", datetime: new Date(2026, 3, 15, 17, 0), createdAt: new Date() },
  { id: "apt-22", title: "NYC trip - flight out", datetime: new Date(2026, 4, 15, 8, 0), createdAt: new Date() },
  { id: "apt-23", title: "NYC trip - flight back", datetime: new Date(2026, 4, 19, 18, 0), createdAt: new Date() },
];

const seedTodos: Todo[] = [
  // Today / Urgent
  { id: "todo-1", title: "Pick up prescription", dueDate: daysFromNow(0), createdAt: new Date() },
  { id: "todo-2", title: "Call insurance about claim", dueDate: daysFromNow(0), createdAt: new Date() },
  { id: "todo-3", title: "Reply to Sarah's email", createdAt: new Date() },
  
  // Travel prep
  { id: "todo-4", title: "Book hotel for Austin trip", dueDate: daysFromNow(5), createdAt: new Date() },
  { id: "todo-5", title: "Pack for SXSW", dueDate: daysFromNow(9), createdAt: new Date() },
  { id: "todo-6", title: "Download offline maps for Austin", createdAt: new Date() },
  { id: "todo-7", title: "Confirm car rental reservation", dueDate: daysFromNow(8), createdAt: new Date() },
  
  // People / Networking
  { id: "todo-8", title: "Send thank you note to Mike", createdAt: new Date() },
  { id: "todo-9", title: "Connect with Lisa on LinkedIn", createdAt: new Date() },
  { id: "todo-10", title: "Schedule coffee with new team member", createdAt: new Date() },
  { id: "todo-11", title: "Follow up with recruiter about role", dueDate: daysFromNow(2), createdAt: new Date() },
  { id: "todo-12", title: "Send birthday card to Dad", dueDate: daysFromNow(14), createdAt: new Date() },
  
  // Health
  { id: "todo-13", title: "Schedule B12 shot", dueDate: daysFromNow(1), createdAt: new Date() },
  { id: "todo-14", title: "Order new vitamins", createdAt: new Date() },
  { id: "todo-15", title: "Renew gym membership", dueDate: daysFromNow(5), createdAt: new Date() },
  { id: "todo-16", title: "Book massage appointment", createdAt: new Date() },
  
  // Home / Personal
  { id: "todo-17", title: "Buy groceries", createdAt: new Date() },
  { id: "todo-18", title: "Fix leaky faucet", createdAt: new Date() },
  { id: "todo-19", title: "Update emergency contacts", createdAt: new Date() },
  { id: "todo-20", title: "Research new phone plans", createdAt: new Date() },
  
  // Work
  { id: "todo-21", title: "Prepare slides for Monday presentation", dueDate: daysFromNow(3), createdAt: new Date() },
  { id: "todo-22", title: "Review Q1 budget proposal", dueDate: daysFromNow(4), createdAt: new Date() },
  { id: "todo-23", title: "Submit expense report", dueDate: daysFromNow(1), createdAt: new Date() },
];

const seedHabits: Habit[] = [
  // Health / Wellness
  {
    id: "habit-1",
    title: "Take daily vitamins",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-5) },
      { date: daysFromNow(-4) },
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
      { date: daysFromNow(-3) },
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
      { date: daysFromNow(-2) },
      { date: daysFromNow(-1) },
    ],
  },
  {
    id: "habit-4",
    title: "10 min meditation",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-6) },
      { date: daysFromNow(-5) },
      { date: daysFromNow(-4) },
      { date: daysFromNow(-3) },
      { date: daysFromNow(-2) },
      { date: daysFromNow(-1) },
    ],
  },
  {
    id: "habit-5",
    title: "Stretch for 10 minutes",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-1) },
    ],
  },
  
  // Learning / Growth
  {
    id: "habit-6",
    title: "Read for 30 minutes",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-4) },
      { date: daysFromNow(-2) },
    ],
  },
  {
    id: "habit-7",
    title: "Practice Spanish on Duolingo",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-3) },
      { date: daysFromNow(-2) },
      { date: daysFromNow(-1) },
    ],
  },
  {
    id: "habit-8",
    title: "Journal before bed",
    frequency: "daily",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-1) },
    ],
  },
  
  // Weekly
  {
    id: "habit-9",
    title: "Weekly meal prep",
    frequency: "weekly",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-7) },
    ],
  },
  {
    id: "habit-10",
    title: "B12 injection",
    frequency: "weekly",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-7) },
    ],
  },
  {
    id: "habit-11",
    title: "Call parents",
    frequency: "weekly",
    createdAt: new Date(),
    completions: [
      { date: daysFromNow(-5) },
    ],
  },
  {
    id: "habit-12",
    title: "Review weekly goals",
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
