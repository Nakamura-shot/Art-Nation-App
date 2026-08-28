import {NextResponse} from "next/server";import {getAdminUserWithRefresh} from "@/lib/admin-auth";import {makeImap,makeSmtp,emailConfig,configured} from "@/lib/email-server";
export async function GET(){
 if(!(await getAdminUserWithRefresh()))return NextResponse.json({error:"Unauthorized"},{status:401});
 if(!configured())return NextResponse.json({ok:false,error:"Email environment variables are incomplete."},{status:503});
 const imap=makeImap();
 try{
  await imap.connect();await imap.logout();const smtp=makeSmtp();await smtp.verify();const c=emailConfig();
  return NextResponse.json({ok:true,email:c.fromAddress,imap:`${c.imapHost}:${c.imapPort}`,smtp:`${c.smtpHost}:${c.smtpPort}`});
 }catch(e:any){try{await imap.logout()}catch{};return NextResponse.json({ok:false,error:e.message||"Connection test failed."},{status:500})}
}