export function shouldReduceMotion({ setting, search, systemPreference }) {
  const queryPreference = new URLSearchParams(search).get('reducedMotion') === '1';
  return Boolean(setting || queryPreference || systemPreference);
}
