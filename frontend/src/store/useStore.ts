import { create } from 'zustand';

interface User {
    id: string;
    email: string;
    name: string;
    phone?: string;
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
    line_items?: { name: string; price: number }[];
    gst_details?: { cgst: number; sgst: number; igst: number; total_gst: number };
    receipt_image_base64?: string;
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
    biometricsEnabled: boolean;
    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    setExpenses: (expenses: Expense[]) => void;
    setBiometricsEnabled: (enabled: boolean) => void;
    removeExpense: (id: string) => void;
    logout: () => void;
}

export const useStore = create<AppState>((set) => ({
    user: null,
    token: null,
    expenses: [],
    biometricsEnabled: false,
    setUser: (user) => set({ user }),
    setToken: (token) => set({ token }),
    setExpenses: (expenses) => set({ expenses }),
    setBiometricsEnabled: (biometricsEnabled) => set({ biometricsEnabled }),
    removeExpense: (id) => set((state) => ({ expenses: state.expenses.filter((e) => e.id !== id) })),
    logout: () => set({ user: null, token: null, expenses: [], biometricsEnabled: false }),
}));
