export const isAssetNSFW = (item) => {
    if (!item) return false;
    
    const toLowerStr = (v) => String(v || '').toLowerCase();
    
    const isRestricted = (str) => {
        if (!str) return false;
        const s = toLowerStr(str);
        return s.includes('adults') || s.includes('adultos') || s.includes('nsfw');
    };

    // Check arrays of strings or objects
    const hasAdults = (arr) => {
        if (!Array.isArray(arr)) return false;
        return arr.some(v => {
            if (typeof v === 'string') return isRestricted(v);
            if (v && typeof v === 'object') {
                return isRestricted(v.slug) || isRestricted(v.name) || isRestricted(v.nameEn);
            }
            return false;
        });
    };

    return (
        hasAdults(item.tags) ||
        hasAdults(item.tagSlugs) ||
        hasAdults(item.chips) ||
        hasAdults(item.chipsEs) ||
        hasAdults(item.chipsEn) ||
        hasAdults(item.categories) ||
        isRestricted(item.category) ||
        isRestricted(item.categoryName) ||
        isRestricted(item.categoryEn)
    );
};
