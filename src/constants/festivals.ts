// Festival Constants
export const FESTIVALS = {
    CANNES: {
        name: 'Cannes Film Festival',
        shortName: 'Cannes',
        country: 'France',
        awards: ['Palme d\'Or', 'Grand Prix', 'Jury Prize', 'Best Director', 'Best Actor', 'Best Actress', 'Best Screenplay'],
        color: '#d4af37',
        icon: '🏆',
    },

    VENICE: {
        name: 'Venice International Film Festival',
        shortName: 'Venice',
        country: 'Italy',
        awards: ['Golden Lion', 'Silver Lion', 'Volpi Cup', 'Marcello Mastroianni Award'],
        color: '#8b0000',
        icon: '🦁',
    },

    BERLIN: {
        name: 'Berlin International Film Festival',
        shortName: 'Berlin',
        country: 'Germany',
        awards: ['Golden Bear', 'Silver Bear', 'Alfred Bauer Prize'],
        color: '#ffd700',
        icon: '🐻',
    },

    SUNDANCE: {
        name: 'Sundance Film Festival',
        shortName: 'Sundance',
        country: 'USA',
        awards: ['Grand Jury Prize', 'Audience Award', 'Directing Award', 'Cinematography Award'],
        color: '#ff6b35',
        icon: '⛰️',
    },

    TIFF: {
        name: 'Toronto International Film Festival',
        shortName: 'TIFF',
        country: 'Canada',
        awards: ['People\'s Choice Award', 'Platform Prize', 'Discovery Award'],
        color: '#1e40af',
        icon: '🍁',
    },
};

// Other prestigious awards
export const AWARDS = {
    OSCARS: {
        name: 'Academy Awards',
        shortName: 'Oscars',
        categories: ['Best Picture', 'Best Director', 'Best Actor', 'Best Actress', 'Best Supporting Actor', 'Best Supporting Actress', 'Best Original Screenplay', 'Best Adapted Screenplay', 'Best Cinematography', 'Best Film Editing', 'Best Original Score', 'Best Original Song', 'Best Visual Effects', 'Best Sound', 'Best Production Design', 'Best Costume Design', 'Best Makeup and Hairstyling', 'Best International Feature Film', 'Best Animated Feature Film', 'Best Documentary Feature', 'Best Documentary Short Film', 'Best Live Action Short Film', 'Best Animated Short Film'],
        color: '#ffd700',
        icon: '🏆',
    },

    GOLDEN_GLOBE: {
        name: 'Golden Globe Awards',
        shortName: 'Golden Globe',
        categories: ['Best Motion Picture - Drama', 'Best Motion Picture - Musical or Comedy', 'Best Director', 'Best Actor - Drama', 'Best Actor - Musical or Comedy', 'Best Actress - Drama', 'Best Actress - Musical or Comedy'],
        color: '#d4af37',
        icon: '🌟',
    },

    BAFTA: {
        name: 'British Academy Film Awards',
        shortName: 'BAFTA',
        categories: ['Best Film', 'Best Director', 'Best Leading Actor', 'Best Leading Actress', 'Best Supporting Actor', 'Best Supporting Actress'],
        color: '#8b4513',
        icon: '🎭',
    },

    CRITICS_CHOICE: {
        name: 'Critics Choice Movie Awards',
        shortName: 'Critics Choice',
        categories: ['Best Picture', 'Best Director', 'Best Actor', 'Best Actress'],
        color: '#4b0082',
        icon: '📝',
    },
};

// Special collections
export const SPECIAL_COLLECTIONS = {
    CRITERION: {
        name: 'Criterion Collection',
        shortName: 'Criterion',
        description: 'Films selected by Criterion Collection',
        color: '#000000',
        icon: '📚',
    },

    ARTHOUSE: {
        name: 'Arthouse Cinema',
        shortName: 'Arthouse',
        description: 'Independent and artistic films',
        color: '#2d3748',
        icon: '🎨',
    },

    WORLD_CINEMA: {
        name: 'World Cinema',
        shortName: 'World',
        description: 'International films from around the world',
        color: '#1a365d',
        icon: '🌍',
    },
}; 