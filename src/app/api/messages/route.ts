import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, getDemoUserId } from "@/lib/http";
const schema=z.object({rideId:z.string(),body:z.string().min(1).max(2000)});
export async function GET(req:Request){
 const {searchParams}=new URL(req.url); const rideId=searchParams.get("rideId");
 if(!rideId)return badRequest("rideId is required.");
 const messages=await db.message.findMany({where:{rideId},include:{sender:{select:{id:true,name:true}}},orderBy:{createdAt:"asc"}});
 return NextResponse.json({messages});
}
export async function POST(req:Request){
 const senderId=getDemoUserId(req); if(!senderId)return badRequest("Sign in first.",401);
 const p=schema.safeParse(await req.json()); if(!p.success)return badRequest("Invalid message.");
 const msg=await db.message.create({data:{...p.data,senderId}});
 return NextResponse.json({message:msg},{status:201});
}
