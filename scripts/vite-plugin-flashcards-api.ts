/**
 * Vite dev-server middleware: CRUD for src/data/flashcards.json + public/flashcards/*
 * Active only during `vite` / `npm run dev` — not included in production builds.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { FLASHCARD_DECK_IDS } from "../src/data/flashcardDecks";

const MAX_TITLE_LENGTH = 200;
const MAX_TEXT_LENGTH = 50_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const MIME_EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

type SideInput = {
  text?: string;
  imagePath?: string;
  imageData?: string;
  removeImage?: boolean;
};

type StoredSide = {
  text?: string;
  imagePath?: string;
};

type StoredCard = {
  id: string;
  deck: string;
  title: string;
  front: StoredSide;
  back: StoredSide;
  createdAt: string;
  updatedAt: string;
};

const VALID_DECKS = new Set<string>(FLASHCARD_DECK_IDS);

let writeLock: Promise<void> = Promise.resolve();

async function withWriteLock<T>(fn: () => Promise<T>): Promise<T> {
  const prev = writeLock;
  let release: () => void = () => {};
  writeLock = new Promise((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function jsonPath(root: string) {
  return path.join(root, "src/data/flashcards.json");
}

function imagesDir(root: string) {
  return path.join(root, "public/flashcards");
}

async function readCards(root: string): Promise<StoredCard[]> {
  const raw = await fs.readFile(jsonPath(root), "utf8");
  const data = JSON.parse(raw) as unknown;
  if (!Array.isArray(data)) {
    throw new Error("flashcards.json must contain an array");
  }
  return data as StoredCard[];
}

async function writeCardsAtomic(root: string, cards: StoredCard[]) {
  const target = jsonPath(root);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(cards, null, 2)}\n`, "utf8");
  await fs.rename(tmp, target);
}

function isSafeImagePath(imagePath: string): boolean {
  if (!imagePath.startsWith("/flashcards/")) return false;
  const name = imagePath.slice("/flashcards/".length);
  if (name.includes("..") || name.includes("/") || name.includes("\\")) return false;
  return /^[a-zA-Z0-9-]+-(front|back)\.(png|jpg|jpeg|webp|gif)$/.test(name);
}

function parseDataUrl(dataUrl: string) {
  if (!dataUrl.startsWith("data:")) {
    throw new Error("Invalid image data URL");
  }
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error("Invalid image data URL format");
  const mime = match[1].toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error("Unsupported image type. Use PNG, JPEG, WebP, or GIF.");
  }
  const buffer = Buffer.from(match[2], "base64");
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image exceeds ${MAX_IMAGE_BYTES / (1024 * 1024)}MB limit`);
  }
  if (buffer.length === 0) throw new Error("Empty image data");
  return { mime, buffer };
}

async function deleteImageFile(root: string, publicPath: string) {
  if (!isSafeImagePath(publicPath)) return;
  const name = publicPath.slice("/flashcards/".length);
  const abs = path.join(imagesDir(root), name);
  try {
    await fs.unlink(abs);
  } catch {
    /* ignore missing */
  }
}

async function saveImage(
  root: string,
  cardId: string,
  side: "front" | "back",
  dataUrl: string
): Promise<string> {
  const { mime, buffer } = parseDataUrl(dataUrl);
  const ext = MIME_EXT[mime];
  const filename = `${cardId}-${side}.${ext}`;
  const abs = path.join(imagesDir(root), filename);
  const publicPath = `/flashcards/${filename}`;
  await fs.mkdir(imagesDir(root), { recursive: true });
  await fs.writeFile(abs, buffer);
  return publicPath;
}

function validateSideInput(side: unknown, label: string): SideInput {
  if (!side || typeof side !== "object") {
    throw new Error(`${label} must be an object`);
  }
  const s = side as Record<string, unknown>;
  const out: SideInput = {};
  if (s.text !== undefined) {
    if (typeof s.text !== "string") throw new Error(`${label}.text must be a string`);
    if (s.text.length > MAX_TEXT_LENGTH) throw new Error(`${label} text is too long`);
    if (s.text.trim()) out.text = s.text;
  }
  if (s.imagePath !== undefined) {
    if (typeof s.imagePath !== "string" || !isSafeImagePath(s.imagePath)) {
      throw new Error(`${label}.imagePath is invalid`);
    }
    out.imagePath = s.imagePath;
  }
  if (s.imageData !== undefined) {
    if (typeof s.imageData !== "string") throw new Error(`${label}.imageData must be a string`);
    out.imageData = s.imageData;
  }
  if (s.removeImage === true) out.removeImage = true;
  if (!out.text && !out.imagePath && !out.imageData) {
    throw new Error(`${label} must include text and/or an image`);
  }
  return out;
}

async function resolveSide(
  input: SideInput,
  existingPath: string | undefined,
  root: string,
  cardId: string,
  side: "front" | "back"
): Promise<StoredSide> {
  const out: StoredSide = {};
  if (input.text) out.text = input.text;

  if (input.removeImage) {
    if (existingPath) await deleteImageFile(root, existingPath);
  } else if (input.imageData) {
    if (existingPath) await deleteImageFile(root, existingPath);
    out.imagePath = await saveImage(root, cardId, side, input.imageData);
  } else if (input.imagePath) {
    if (!isSafeImagePath(input.imagePath)) throw new Error("Invalid image path");
    out.imagePath = input.imagePath;
  } else if (existingPath) {
    out.imagePath = existingPath;
  }

  if (!out.text && !out.imagePath) {
    throw new Error(`${side} must include text and/or an image`);
  }
  return out;
}

function deriveTitleFromSideInput(side: SideInput): string {
  const line = side.text?.trim().split(/\r?\n/)[0]?.trim();
  if (line) return line.slice(0, MAX_TITLE_LENGTH);
  if (side.imagePath || side.imageData) return "Image card";
  return "Flashcard";
}

function validateWritePayload(body: unknown) {
  if (!body || typeof body !== "object") throw new Error("Invalid JSON body");
  const b = body as Record<string, unknown>;
  if (typeof b.deck !== "string" || !VALID_DECKS.has(b.deck)) {
    throw new Error("Invalid deck");
  }
  const front = validateSideInput(b.front, "front");
  const back = validateSideInput(b.back, "back");
  let title: string;
  if (typeof b.title === "string" && b.title.trim()) {
    title = b.title.trim();
    if (title.length > MAX_TITLE_LENGTH) throw new Error("Title is too long");
  } else {
    title = deriveTitleFromSideInput(front);
  }
  return { deck: b.deck, title, front, back };
}

async function handleFlashcardsApi(root: string, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? "/", "http://localhost");
  const pathname = url.pathname;

  if (req.method === "GET" && pathname === "/api/flashcards") {
    try {
      const cards = await readCards(root);
      sendJson(res, 200, cards);
    } catch (err) {
      sendJson(res, 500, {
        error: err instanceof Error ? err.message : "Failed to read flashcards",
      });
    }
    return;
  }

  const idMatch = /^\/api\/flashcards\/([^/]+)$/.exec(pathname);
  const cardId = idMatch?.[1];

  if (req.method === "POST" && pathname === "/api/flashcards") {
    try {
      const body = validateWritePayload(JSON.parse(await readBody(req)));
      const id = randomUUID();
      const now = new Date().toISOString();
      const front = await resolveSide(body.front, undefined, root, id, "front");
      const back = await resolveSide(body.back, undefined, root, id, "back");
      const card: StoredCard = {
        id,
        deck: body.deck,
        title: body.title,
        front,
        back,
        createdAt: now,
        updatedAt: now,
      };

      await withWriteLock(async () => {
        const cards = await readCards(root);
        cards.push(card);
        await writeCardsAtomic(root, cards);
      });

      sendJson(res, 201, card);
    } catch (err) {
      sendJson(res, 400, { error: err instanceof Error ? err.message : "Invalid request" });
    }
    return;
  }

  if (cardId && req.method === "PUT") {
    try {
      const body = validateWritePayload(JSON.parse(await readBody(req)));
      let updated: StoredCard | null = null;

      await withWriteLock(async () => {
        const cards = await readCards(root);
        const index = cards.findIndex((c) => c.id === cardId);
        if (index === -1) throw new Error("Flashcard not found");
        const existing = cards[index];
        const front = await resolveSide(
          body.front,
          existing.front.imagePath,
          root,
          cardId,
          "front"
        );
        const back = await resolveSide(body.back, existing.back.imagePath, root, cardId, "back");
        updated = {
          id: cardId,
          deck: body.deck,
          title: body.title,
          front,
          back,
          createdAt: existing.createdAt,
          updatedAt: new Date().toISOString(),
        };
        cards[index] = updated;
        await writeCardsAtomic(root, cards);
      });

      sendJson(res, 200, updated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid request";
      sendJson(res, msg === "Flashcard not found" ? 404 : 400, { error: msg });
    }
    return;
  }

  if (cardId && req.method === "DELETE") {
    try {
      await withWriteLock(async () => {
        const cards = await readCards(root);
        const index = cards.findIndex((c) => c.id === cardId);
        if (index === -1) throw new Error("Flashcard not found");
        const existing = cards[index];
        if (existing.front.imagePath) await deleteImageFile(root, existing.front.imagePath);
        if (existing.back.imagePath) await deleteImageFile(root, existing.back.imagePath);
        cards.splice(index, 1);
        await writeCardsAtomic(root, cards);
      });
      sendJson(res, 200, { ok: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      sendJson(res, msg === "Flashcard not found" ? 404 : 400, { error: msg });
    }
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
}

export function flashcardsApiPlugin(): Plugin {
  return {
    name: "flashcards-api",
    apply: "serve",
    configureServer(server) {
      const root = server.config.root;
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/flashcards")) {
          next();
          return;
        }
        await handleFlashcardsApi(root, req, res);
      });
    },
  };
}
