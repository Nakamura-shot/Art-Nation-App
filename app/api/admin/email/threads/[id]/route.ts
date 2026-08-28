import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {makeImap,parseSource,configured} from "@/lib/email-server";
export async function GET(req:Request,{params}:{params:Promise<{id:string}>}){
 if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!configured())return NextResponse.json({error:"Email server is not configured."},{status:503});
 const {id}=await params;const mailbox=new URL(req.url).searchParams.get("mailbox")||"INBOX";const uid=Number(id);
 if(!uid)return NextResponse.json({error:"Invalid message."},{status:400});
 const client=makeImap();
 try{
  await client.connect();const lock=await client.getMailboxLock(mailbox);
  try{
   const m:any=await client.fetchOne(uid,{uid:true,envelope:true,flags:true,internalDate:true,source:true},{uid:true});
   if(!m)return NextResponse.json({error:"Message not found."},{status:404});
   try{await client.messageFlagsAdd(uid,["\\Seen"],{uid:true})}catch{}
   const parsed=await parseSource(m.source);
   return NextResponse.json({message:{uid:m.uid,mailbox,flags:Array.from(m.flags||[]),internalDate:m.internalDate?.toISOString?.()||parsed.date,...parsed}});
  }finally{lock.release()}
 }catch(e:any){return NextResponse.json({error:e.message||"Could not open email."},{status:500})}
 finally{try{await client.logout()}catch{}}
}