import { NextResponse } from "next/server";
import { db } from "@/lib/prisma";
export async function GET(req:Request){
 const {searchParams}=new URL(req.url);
 const origin=searchParams.get("origin")||"", destination=searchParams.get("destination")||"", date=searchParams.get("date");
 if(!origin||!destination||!date)return NextResponse.json({error:"origin, destination, and date are required."},{status:400});
 const target=new Date(date);
 const rides=await db.ride.findMany({where:{seatsAvailable:{gt:0},departureAt:{gte:new Date(target.getTime()-3*3600000),lte:new Date(target.getTime()+3*3600000)}},include:{driver:{select:{id:true,name:true,studentVerified:true}}}});
 const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9 ]/g,"").trim();
 const score=(r:any)=>{
   const a=norm(r.origin),b=norm(r.destination),o=norm(origin),d=norm(destination);
   let n=0;if(a.includes(o)||o.includes(a))n+=45;if(b.includes(d)||d.includes(b))n+=45;
   if(r.driver.studentVerified)n+=5;
   const hours=Math.abs(r.departureAt.getTime()-target.getTime())/3600000;n+=Math.max(0,5-hours);
   return Math.min(100,Math.round(n));
 };
 const matches=rides.map(r=>({...r,matchScore:score(r),estimatedPricePerPassenger:Number((r.estimatedPrice/r.seatsTotal).toFixed(2))})).filter(r=>r.matchScore>=40).sort((a,b)=>b.matchScore-a.matchScore);
 return NextResponse.json({matches,algorithm:"MVP rule-based route, departure-time, and student-verification scoring. Replace with a trained model only when suitable data is available."});
}
