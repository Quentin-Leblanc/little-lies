export const dayNightTransition = (isDay) => ({
    initial: {
        backgroundColor: isDay ? 'rgba(20, 30, 60, 0.3)' : 'rgba(5, 5, 15, 0.6)',
    },
    animate: {
        backgroundColor: isDay ? 'rgba(20, 30, 60, 0.3)' : 'rgba(5, 5, 15, 0.6)',
    },
    transition: { duration: 1.5, ease: 'easeInOut' },
});

export const voteButtonAnimation = {
    whileHover: { scale: 1.05 },
    whileTap: { scale: 0.95 },
};

export const playerEntryAnimation = {
    initial: { opacity: 0, y: -20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3 },
};

export const fadeIn = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.5 },
};

export const slideUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
};

export const pulseAnimation = {
    animate: {
        scale: [1, 1.02, 1],
        transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
};
