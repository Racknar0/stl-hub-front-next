/**
 * Palabras clave NSFW — deben coincidir con las del backend (nsfwFilter.js).
 * Se usa `includes()` parcial sobre los slugs y nombres de categorías/tags.
 */
const NSFW_KEYWORDS = [
    'adult', '18', 'nsfw', 'hentai', 'sexy', 'erotic', 'erotica', 'desnud', 'gore', 'xxx', 'porn', 'r18', 'fetish', 'fetis', 'bdsm', 'bondage',
    'bikini', 'bunny-girl', 'bunnygirl', 'pin-up', 'pinup', 'sensual', 'waifu', 'lenceria', 'lingerie', 'nude', 'naked', 'panties', 'topless', 'conejita', 'playboy', 'stripper', 'swimsuit', 'swimwear', 'tanga', 'hilo-dental', 'hilo dental', 'sin-ropa', 'sin ropa',
    'seductor', 'seductora', 'provocativ', 'boudoir', 'boobs', 'buttocks', 'trasero', 'nalgas', 'gluteos', 'underboob', 'cleavage', 'escote', 'pezon', 'pezones', 'nipple', 'nipples', 'caliente',
    '3dxm', 'jigglystix', 'digital-dark-pinups', 'anatomia', 'anatomy',
    // Armas, réplicas y cosplay militar/táctico
    'arma', 'weapon', 'gun', 'bullet', 'firearm', 'ammo', 'ammunition', 'granada', 'grenade', 'shotgun', 'escopeta', 
    'rifle', 'fusil', 'revolver', 'pistola', 'pistol', 'ak47', 'glock', 'carbine', 'm870', 'remington', 'colt', 
    'mauser', 'submachine', 'silenciador', 'silencer', 'balas', 'municion', 'katana', 'sword', 'espada', 'cuchillo', 
    'knife', 'knives', 'blade', 'hacha', 'axe', 'shield', 'escudo', 'bayoneta', 'bayonet', 'tactico', 'tactical',
    // Tabaco y accesorios para fumar
    'cenicero', 'ashtray', 'smoke', 'fumar', 'weed', 'marihuana', 'cigarro', 'cigarrillo', 'tabaco', 'tobacco',
    // Violencia, sangre y muerte
    'gore', 'sangre', 'blood', 'kill', 'muerte', 'death', 'esqueleto', 'skeleton', 'craneo', 'skull'
];

export const isAssetNSFW = (item) => {
    if (!item) return false;
    
    const toLowerStr = (v) => String(v || '').toLowerCase();
    
    const isRestricted = (str) => {
        if (!str) return false;
        const s = toLowerStr(str);
        return NSFW_KEYWORDS.some(kw => s.includes(kw));
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
        isRestricted(item.title) ||
        isRestricted(item.slug) ||
        isRestricted(item.titleEs) ||
        isRestricted(item.titleEn) ||
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
