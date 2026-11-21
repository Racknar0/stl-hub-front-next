import HttpService from './HttpService';

// Opiniones de los usuarios sobre la web (modal tras descargas, moderación y portada)
const http = new HttpService();

// Tiempo mínimo entre dos apariciones del modal en el mismo navegador
export const REVIEW_PROMPT_COOLDOWN_MS = 30 * 60 * 1000;
const PROMPT_AT_KEY = 'stlhub_review_prompt_at';
const DONE_KEY = 'stlhub_review_done';

const readStorage = (key) => {
  try { return window.localStorage.getItem(key); } catch { return null; }
};
const writeStorage = (key, value) => {
  try { window.localStorage.setItem(key, value); } catch {}
};

// ¿Toca mostrar el modal? Respeta el respiro local y pregunta al backend (descargas y si ya opinó).
export async function shouldShowReviewPrompt() {
  if (readStorage(DONE_KEY)) return false;
  const last = Number(readStorage(PROMPT_AT_KEY) || 0);
  if (last && Date.now() - last < REVIEW_PROMPT_COOLDOWN_MS) return false;
  const res = await http.getData('/reviews/me/prompt');
  if (res?.data?.hasReview) writeStorage(DONE_KEY, '1');
  return Boolean(res?.data?.show);
}

export const markReviewPromptShown = () => writeStorage(PROMPT_AT_KEY, String(Date.now()));
export const markReviewDone = () => writeStorage(DONE_KEY, '1');

export const createMyReview = (payload) => http.postData('/reviews', payload);
export const getPublicReviews = () => http.getData('/reviews/public?take=20');

export const adminListReviews = (status) => http.getData(`/admin/reviews?status=${encodeURIComponent(status)}`);
export const adminUpdateReview = (id, data) => http.patchData('/admin/reviews', id, data);
export const adminDeleteReview = (id) => http.deleteData('/admin/reviews', id);
