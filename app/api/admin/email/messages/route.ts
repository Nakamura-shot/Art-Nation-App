import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {makeImap,findMailbox,configured} from "@/lib/email-server";
import {rest} from "@/lib/supabase-rest";

function addr(env:any,field:"from"|"to"){
 const list=env?.[field]||[];return list.map((a:any)=>a.name?`${a.name} <${a.address}>`:a.address).join(", ");
}
function addressOnly(v:string){
 const m=v.match(/<([^>]+)>/);return (m?.[1]||v||"").trim().toLowerCase();
}
export async function GET(req:Request){
 if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!configured())return NextResponse.json({error:"Email server is not configured."},{status:503});

 const u=new URL(req.url);
 const folder=(u.searchParams.get("folder")||"inbox") as "inbox"|"sent";
 const q=(u.searchParams.get("q")||"").trim().toLowerCase();
 const unread=u.searchParams.get("unread")==="1";
 const client=makeImap();

 try{
  await client.connect();
  const mailbox=await findMailbox(client,folder);
  const lock=await client.getMailboxLock(mailbox);

  try{
   // Search returns actual message UIDs. This is safer than relying on sequence
   // numbers, which can move as mail is expunged or Roundcube changes the box.
   const allUids:number[]=await client.search({all:true},{uid:true}) as number[];
   if(!allUids.length)return NextResponse.json({messages:[],mailbox,checked:0});

   const latest=allUids.slice(-150).reverse();
   const result:any[]=[];

   for(const uid of latest){
    const m:any=await client.fetchOne(uid,{uid:true,envelope:true,flags:true,internalDate:true,bodyStructure:true},{uid:true});
    if(!m)continue;
    if(unread&&m.flags?.has("\\Seen"))continue;

    const from=addr(m.envelope,"from"),to=addr(m.envelope,"to");
    const subject=m.envelope?.subject||"(no subject)";
    const hay=`${from} ${to} ${subject}`.toLowerCase();

    // Search by headers here. Full-body searching is intentionally deferred
    // until opening a message to keep inbox refresh fast and reliable.
    if(q&&!hay.includes(q))continue;

    result.push({
     uid,mailbox,flags:Array.from(m.flags||[]),
     internalDate:m.internalDate?.toISOString?.()||null,
     date:m.envelope?.date?.toISOString?.()||null,
     from,to,subject,
     snippet:"",
     hasAttachments:JSON.stringify(m.bodyStructure||{}).toLowerCase().includes("attachment")
    });
    if(result.length>=50)break;
   }

   const senderEmails=Array.from(new Set(result.map(x=>addressOnly(x.from)).filter(Boolean)));
   const customerMap:any={};
   for(const email of senderEmails){
    const c=await rest<any[]>(`customers?select=id,full_name,email,phone&email=ilike.${encodeURIComponent(email)}&limit=1`,{},true);
    if(c[0])customerMap[email]=c[0];
   }

   return NextResponse.json({
    messages:result.map(m=>({...m,customer:customerMap[addressOnly(m.from)]||null})),
    mailbox,checked:latest.length,totalUids:allUids.length,refreshedAt:new Date().toISOString()
   });
  }finally{lock.release()}
 }catch(e:any){
  console.error("IMAP_LIST_ERROR",e);
  return NextResponse.json({error:e.message||"Could not load mailbox."},{status:500});
 }finally{
  try{await client.logout()}catch{}
 }
}