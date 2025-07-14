// Font Constants
export const FONTS = {
    // Primary Font Family (Monospace)
    FAMILY: '"JetBrains Mono", "Fira Code", "Consolas", "Monaco", monospace',

    // Font Sizes
    SIZE: {
        XS: '0.75rem', // 12px
        SM: '0.875rem', // 14px
        BASE: '1rem', // 16px
        LG: '1.125rem', // 18px
        XL: '1.25rem', // 20px
        '2XL': '1.5rem', // 24px
        '3XL': '1.875rem', // 30px
        '4XL': '2.25rem', // 36px
    },

    // Font Weights
    WEIGHT: {
        LIGHT: '300',
        NORMAL: '400',
        MEDIUM: '500',
        SEMIBOLD: '600',
        BOLD: '700',
    },

    // Line Heights
    LINE_HEIGHT: {
        TIGHT: '1.25',
        NORMAL: '1.5',
        RELAXED: '1.75',
    },

    // Letter Spacing
    LETTER_SPACING: {
        TIGHT: '-0.025em',
        NORMAL: '0',
        WIDE: '0.025em',
    },
};

// Typography Classes for Tailwind
export const TYPOGRAPHY = {
    // Headings
    H1: 'text-4xl font-bold leading-tight',
    H2: 'text-3xl font-semibold leading-tight',
    H3: 'text-2xl font-semibold leading-tight',
    H4: 'text-xl font-medium leading-tight',
    H5: 'text-lg font-medium leading-tight',
    H6: 'text-base font-medium leading-tight',

    // Body Text
    BODY_LARGE: 'text-lg leading-relaxed',
    BODY: 'text-base leading-normal',
    BODY_SMALL: 'text-sm leading-normal',

    // Special Text
    CAPTION: 'text-xs leading-normal',
    LABEL: 'text-sm font-medium leading-normal',
    BUTTON: 'text-sm font-medium leading-normal',

    // Code and Monospace
    CODE: 'text-sm font-normal leading-normal',
    CODE_BLOCK: 'text-sm font-normal leading-relaxed',
}; 