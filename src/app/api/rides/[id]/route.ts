import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
export async function GET(_: Request, { params }: { params: Promise<{id:string}> }) {
  const { id } = await params;
  const ride = await db.ride.findUnique({ where: { id }, include: { driver: { select: { id:true,name:true,studentVerified:true } }, bookings: { include: { passenger: { select: { id:true,name:true,studentVerified:true } } } } } });
  if (!ride) return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  return NextResponse.json({ ride });
}
