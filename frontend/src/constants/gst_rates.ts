export const GST_SLABS = [
    { label: '0%', value: 0 },
    { label: '5%', value: 5 },
    { label: '18%', value: 18 },
    { label: '40%', value: 40 },
];

export const CATEGORY_GST_DEFAULTS: Record<string, number> = {
    'Food Delivery': 18,
    'Groceries': 5,
    'Shopping': 5,
    'Transport': 18,
    'Entertainment': 18,
    'Bills & Utilities': 18,
    'Others': 18,
};
