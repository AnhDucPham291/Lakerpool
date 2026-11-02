import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, getDemoUserId } from "@/lib/http";
const schema=z.object({driverId:z.string(),rideId:z.string(),rating:z.number().int().min(1).max(5),comment:z.string().max(1000).optional()});
export async function POST(req:Request){
 const reviewerId=getDemoUserId(req); if(!reviewerId)return badRequest("Sign in first.",401);
 const p=schema.safeParse(await req.json()); if(!p.success)return badRequest("Invalid review.");
 const booking=await db.booking.findFirst({where:{rideId:p.data.rideId,passengerId:reviewerId,status:"COMPLETED"}});
 if(!booking)return badRequest("Only passengers with a completed ride can review.");
 const review=await db.review.create({data:{...p.data,reviewerId}});
 return NextResponse.json({review},{status:201});
}
