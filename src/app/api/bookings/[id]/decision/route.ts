import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/prisma";
import { badRequest, getDemoUserId } from "@/lib/http";
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
  const driverId=getDemoUserId(req); if(!driverId) return badRequest("Sign in first.",401);
  const {id}=await params; const body=z.object({accept:z.boolean()}).safeParse(await req.json());
  if(!body.success) return badRequest("Decision must be true or false.");
  const booking=await db.booking.findUnique({where:{id},include:{ride:true}});
  if(!booking) return badRequest("Booking not found.",404);
  if(booking.ride.driverId!==driverId) return badRequest("Only the ride driver can decide.",403);
  if(booking.status!=="PENDING") return badRequest("This request has already been processed.");
  if(body.data.accept && booking.ride.seatsAvailable<booking.seats) return badRequest("Not enough seats remain.");
  const updated=await db.$transaction(async tx=>{
    const b=await tx.booking.update({where:{id},data:{status:body.data.accept?"ACCEPTED":"DECLINED"}});
    if(body.data.accept) await tx.ride.update({where:{id:booking.rideId},data:{seatsAvailable:{decrement:booking.seats}}});
    return b;
  });
  return NextResponse.json({booking:updated});
}
