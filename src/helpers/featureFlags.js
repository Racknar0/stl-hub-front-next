const parseBooleanEnv = (rawValue, defaultValue) => {
  if (rawValue === undefined || rawValue === null) return defaultValue;
  const v = String(rawValue).trim().toLowerCase();
  if (v === '') return defaultValue;
  if (['1', 'true', 'yes', 'y', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'n', 'off'].includes(v)) return false;
  return defaultValue;
};

export const HOME_CARD_IMAGE_SLIDER_ENABLED = parseBooleanEnv(
  process.env.NEXT_PUBLIC_HOME_CARD_IMAGE_SLIDER,
  true
);
