// Eliminar este archivo. La API vive en el backend (Express/SQLite).
import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'broken-reports.json');

async function ensureStore() {
  try { await fs.mkdir(DATA_DIR, { recursive: true }); } catch {}
  try { await fs.access(DATA_FILE); } catch {
    await fs.writeFile(DATA_FILE, '[]', 'utf8');
  }
}
async function readAll() {
  await ensureStore();
  const raw = await fs.readFile(DATA_FILE, 'utf8');
  try { return JSON.parse(raw) || []; } catch { return []; }
}
async function writeAll(items) {
  await ensureStore();
  await fs.writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf8');
}

export async function GET() {
  return NextResponse.json({ ok: false, error: 'MOVED', use: 'Backend /admin/reports/broken' }, { status: 410 });
}
export async function POST() {
  return NextResponse.json({ ok: false, error: 'MOVED', use: 'Backend /assets/:id/report-broken-link' }, { status: 410 });
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const assetId = String(body?.assetId || '').trim();
    const note = String(body?.note || '').trim().slice(0, 1000);
    // const captchaToken = body?.captchaToken; // TODO: validar cuando se integre

    if (!assetId) {
      return NextResponse.json({ ok: false, error: 'INVALID_ASSET' }, { status: 400 });
    }

    const ua = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';

    const rec = {
      id: crypto.randomUUID(),
      assetId,
      note,
      status: 'NEW',
      createdAt: new Date().toISOString(),
      ua,
      ip,
    };

    const items = await readAll();
    items.unshift(rec);
    await writeAll(items);

    return NextResponse.json({ ok: true, data: rec }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'WRITE_ERROR' }, { status: 500 });
  }
}
