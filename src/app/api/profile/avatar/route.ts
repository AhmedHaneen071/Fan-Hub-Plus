import { randomUUID } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireMember, isSuspended } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
const MAX_BYTES = 2 * 1024 * 1024;

function imageExtension(bytes: Uint8Array): "png" | "jpg" | "webp" | null {
  if (bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a) return "png";
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request) {
  const session = await auth();
  const member = requireMember(session);
  if (!member.ok) return NextResponse.json({ error: member.error }, { status: 403 });
  if (isSuspended(session)) return NextResponse.json({ error: "Suspended accounts cannot update their profile." }, { status: 403 });
  const limit = rateLimit(`avatar:${member.userId}`, 10, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "You have uploaded the maximum number of avatars for this hour." }, { status: 429 });
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_BYTES + 64 * 1024) return NextResponse.json({ error: "Choose an image under 2 MB." }, { status: 413 });
  try {
    const form = await request.formData();
    const file = form.get("avatar");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Choose an image under 2 MB." }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const extension = imageExtension(bytes);
    if (!extension) return NextResponse.json({ error: "Only valid PNG, JPEG, or WebP images are allowed." }, { status: 400 });

    const filename = `${randomUUID()}.${extension}`;
    const directory = path.join(process.cwd(), "public", "uploads");
    await mkdir(directory, { recursive: true });
    const absolutePath = path.join(directory, filename);
    const publicUrl = `/uploads/${filename}`;
    await writeFile(absolutePath, bytes, { flag: "wx", mode: 0o644 });
    try {
      await prisma.user.update({ where: { id: member.userId }, data: { avatar_url: publicUrl } });
    } catch {
      await unlink(absolutePath).catch(() => undefined);
      return NextResponse.json({ error: "The avatar could not be saved to your profile." }, { status: 500 });
    }
    return NextResponse.json({ avatarUrl: publicUrl });
  } catch {
    return NextResponse.json({ error: "The avatar could not be uploaded." }, { status: 400 });
  }
}
