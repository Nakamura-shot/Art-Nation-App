import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {rest} from "@/lib/supabase-rest";

function participantName(p:any,fallback:string){
 const a=p.answers||{};
 return a["full-name"]||a.full_name||a.name||a["participant-name"]||fallback;
}

async function ensureGuideAccess(customerId:string,guideId:string,source:string){
 const existing=await rest<any[]>(`customer_guide_access?select=id&customer_id=eq.${customerId}&guide_id=eq.${guideId}&limit=1`,{},true);
 if(existing[0]){
  await rest(`customer_guide_access?id=eq.${existing[0].id}`,{
   method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({source})
  },true);
 }else{
  await rest("customer_guide_access",{
   method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({customer_id:customerId,guide_id:guideId,source})
  },true);
 }
}

async function ensureEntitlement(booking:any,p:any,guideId:string,customerId:string|null,email:string,status:string){
 const existing=await rest<any[]>(`guide_entitlements?select=id&participant_id=eq.${p.id}&guide_id=eq.${guideId}&limit=1`,{},true);
 const payload={
  booking_id:booking.id,participant_id:p.id,participant_no:p.participant_no,guide_id:guideId,
  customer_id:customerId,assigned_email:email||null,status,source:"booking"
 };
 if(existing[0]){
  await rest(`guide_entitlements?id=eq.${existing[0].id}`,{
   method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)
  },true);
 }else{
  await rest("guide_entitlements",{
   method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(payload)
  },true);
 }
}

export async function POST(_:Request,{params}:{params:Promise<{id:string}>}){
 if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
 const {id}=await params;

 const rows=await rest<any[]>(`bookings?select=id,reference,order_id,status,orders!inner(customer_id,customers!inner(id,full_name,email,portal_token)),participants(id,participant_no,answers,guide_email),event_sessions!inner(id,events!inner(guide_id))&id=eq.${encodeURIComponent(id)}&limit=1`,{},true);
 const booking=rows[0];
 if(!booking)return NextResponse.json({error:"Booking not found"},{status:404});

 const orderId=booking.order_id;

 // Payment confirmation itself must not be blocked by a guide-access problem.
 await rest(`bookings?id=eq.${encodeURIComponent(id)}`,{
  method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"confirmed"})
 },true);
 await rest(`payments?order_id=eq.${encodeURIComponent(orderId)}`,{
  method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"verified",verified_at:new Date().toISOString()})
 },true);
 await rest(`orders?id=eq.${encodeURIComponent(orderId)}`,{
  method:"PATCH",headers:{Prefer:"return=minimal"},body:JSON.stringify({status:"confirmed"})
 },true);

 const guideId=booking.event_sessions?.events?.guide_id;
 const bookingCustomer=booking.orders?.customers;
 let granted=0,unclaimed=0;
 const warnings:string[]=[];

 if(guideId){
  const participants=[...(booking.participants||[])].sort((a:any,b:any)=>a.participant_no-b.participant_no);

  for(const p of participants){
   try{
    const email=String(p.guide_email||"").trim().toLowerCase();
    let customerId:string|null=null;
    let status="unclaimed";

    if(email){
     if(String(bookingCustomer?.email||"").toLowerCase()===email){
      customerId=bookingCustomer.id;
     }else{
      const found=await rest<any[]>(`customers?select=id,full_name,email,portal_token&email=eq.${encodeURIComponent(email)}&order=created_at.asc&limit=1`,{},true);
      if(found[0])customerId=found[0].id;
      else{
       const created=await rest<any[]>("customers",{
        method:"POST",headers:{Prefer:"return=representation"},
        body:JSON.stringify({full_name:participantName(p,`Participant ${p.participant_no}`),email,marketing_opt_in:false})
       },true);
       customerId=created[0].id;
      }
      status="assigned";
     }
     if(customerId===bookingCustomer?.id)status="assigned";
    }

    await ensureEntitlement(booking,p,guideId,customerId,email,status);

    if(customerId){
     await ensureGuideAccess(customerId,guideId,`booking:${id}:participant:${p.participant_no}`);
     granted++;
    }else{
     unclaimed++;
    }
   }catch(err:any){
    console.error("GUIDE_ENTITLEMENT_WARNING",p.participant_no,err);
    warnings.push(`Participant ${p.participant_no}: ${err?.message||"guide access could not be created"}`);
   }
  }
 }

 return NextResponse.json({
  ok:true,
  paymentConfirmed:true,
  guideGranted:!!guideId,
  assignedEntitlements:granted,
  unclaimedEntitlements:unclaimed,
  guideWarnings:warnings,
  portalToken:bookingCustomer?.portal_token||null
 });
}