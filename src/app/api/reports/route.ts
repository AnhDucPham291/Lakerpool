import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, getDemoUserId } from "@/lib/http";
const schema=z.object({rideId:z.string(),category:z.string().min(2),description:z.string().min(5),severity:z.enum(["LOW","MEDIUM","HIGH","EMERGENCY"])});
export async function POST(req:Request){
 const reporterId=getDemoUserId(req); if(!reporterId)return badRequest("Sign in first.",401);
 const p=schema.safeParse(await req.json()); if(!p.success)return badRequest("Please include a category, description, and severity.");
 const report=await db.safetyReport.create({data:{...p.data,reporterId}});
 // Production: route HIGH/EMERGENCY reports to a monitored safety team and display local emergency guidance.
 return NextResponse.json({report,notice:"Report saved. This demo does not contact campus police or emergency services."},{status:201});
}
