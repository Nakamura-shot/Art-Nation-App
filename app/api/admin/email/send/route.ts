import {NextResponse} from "next/server";
import {getAdminUserWithRefresh} from "@/lib/admin-auth";
import {makeSmtp,makeImap,findMailbox,emailConfig,configured} from "@/lib/email-server";
import {rest} from "@/lib/supabase-rest";
export async function POST(req:Request){
 try{
  if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
  if(!configured())return NextResponse.json({error:"Email server is not configured."},{status:503});
  const b=await req.json();if(!String(b.to||"").trim()||!String(b.subject||"").trim()||!String(b.body||"").trim())return NextResponse.json({error:"Recipient, subject and message are required."},{status:400});
  const c=emailConfig(),smtp=makeSmtp();
  const info=await smtp.sendMail({
   from:{name:c.fromName,address:c.fromAddress},to:b.to,subject:b.subject,text:b.body,
   inReplyTo:b.inReplyTo||undefined,references:b.references||undefined
  });

  // SMTP does not always place a copy into the cPanel Sent folder.
  // Append a copy by IMAP so Art Nation Admin and Roundcube stay in sync.
  try{
   const imap=makeImap();await imap.connect();const sentBox=await findMailbox(imap,"sent");
   const enc=(s:string)=>`=?UTF-8?B?${Buffer.from(s,"utf8").toString("base64")}?=`;
   const raw=[
    `From: ${enc(c.fromName)} <${c.fromAddress}>`,`To: ${b.to}`,`Subject: ${enc(String(b.subject))}`,
    `Date: ${new Date().toUTCString()}`,`Message-ID: ${info.messageId||""}`,"MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',"Content-Transfer-Encoding: 8bit",
    b.inReplyTo?`In-Reply-To: ${b.inReplyTo}`:"",b.references?`References: ${b.references}`:"",
    "",String(b.body)
   ].filter((x,i)=>x!==""||i>9).join("\r\n");
   await imap.append(sentBox,Buffer.from(raw,"utf8"),["\\Seen"],new Date());await imap.logout();
  }catch(sentCopyError){console.warn("SENT_COPY_WARNING",sentCopyError)}
  await rest("email_send_log",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({
   customer_id:b.customer_id||null,booking_id:b.booking_id||null,gmail_message_id:info.messageId||null,gmail_thread_id:null,
   recipient:b.to,subject:b.subject,body:b.body,status:"sent"
  })},true).catch(()=>null);
  if(b.customer_id)await rest("communication_log",{method:"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify({
   customer_id:b.customer_id,booking_id:b.booking_id||null,channel:"email",destination:b.to,message_body:b.body,status:"sent",sent_at:new Date().toISOString()
  })},true).catch(()=>null);
  return NextResponse.json({ok:true,messageId:info.messageId});
 }catch(e:any){console.error("SMTP_SEND_ERROR",e);return NextResponse.json({error:e.message||"Could not send email."},{status:500})}
}