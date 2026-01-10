"use client";

import { createContext, useContext, useState } from "react";
import { Todo } from "@/types/todo";
import { Habit } from "@/types/habit";
import { Appointment } from "@/types/appointment";

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
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);

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
