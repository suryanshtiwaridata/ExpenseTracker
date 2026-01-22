import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    name: string;
    currency: string;
}

interface Expense {
    id: string;
    amount: number;
    date: string;
    category: string;
    description?: string;
    vendor?: string;
    items?: string[];
    source: string;
    payment_mode?: string;
    tax_amount?: number;
    tax_type?: string;
    currency: string;
}

interface AppState {
    user: User | null;
    token: string | null;
    expenses: Expense[];
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setExpenses: (expenses: Expense[]) => void;
    removeExpense: (id: string) => void;
    logout: () => void;
}

export const useStore = create<AppState>((set) => ({
    user: null,
    token: null,
    expenses: [],
    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),
    setExpenses: (expenses) => set({ expenses }),
    removeExpense: (id) => set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
    logout: () => set({ user: null, token: null, expenses: [] }),
}));
