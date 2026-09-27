import { z } from "zod";
import { NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

const idSchema = z.string().trim().min(1).max(60);

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const ip = await getClientIp();
  const limit = rateLimit(`merch-view:${ip}`, 120, 60 * 60 * 1000);
  if (!limit.ok) return NextResponse.json({ error: "View limit reached." }, { status: 429 });
  const result = await prisma.merchandiseItem.updateMany({ where: { id: parsed.data }, data: { view_count: { increment: 1 } } });
  if (result.count === 0) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
