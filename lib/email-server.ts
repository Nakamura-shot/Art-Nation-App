import nodemailer from "nodemailer";
import {ImapFlow} from "imapflow";
import {simpleParser} from "mailparser";

function required(name:string){
 const v=process.env[name];
 if(!v)throw new Error(`${name} is not configured.`);
 return v;
}
export function emailConfig(){
 return {
  imapHost:required("EMAIL_IMAP_HOST"),
  imapPort:Number(process.env.EMAIL_IMAP_PORT||993),
  smtpHost:required("EMAIL_SMTP_HOST"),
  smtpPort:Number(process.env.EMAIL_SMTP_PORT||465),
  username:required("EMAIL_USERNAME"),
  password:required("EMAIL_PASSWORD"),
  fromName:process.env.EMAIL_FROM_NAME||"Art Nation Cebu",
  fromAddress:process.env.EMAIL_FROM_ADDRESS||required("EMAIL_USERNAME")
 };
}
export function configured(){
 return !!(process.env.EMAIL_IMAP_HOST&&process.env.EMAIL_SMTP_HOST&&process.env.EMAIL_USERNAME&&process.env.EMAIL_PASSWORD);
}
export function makeImap(){
 const c=emailConfig();
 return new ImapFlow({host:c.imapHost,port:c.imapPort,secure:true,auth:{user:c.username,pass:c.password},logger:false});
}
export function makeSmtp(){
 const c=emailConfig();
 return nodemailer.createTransport({host:c.smtpHost,port:c.smtpPort,secure:c.smtpPort===465,auth:{user:c.username,pass:c.password}});
}
function addr(x:any){
 const list=Array.isArray(x)?x:[x];
 return list.filter(Boolean).flatMap((item:any)=>item?.value||[]).map((a:any)=>a.name?`${a.name} <${a.address}>`:a.address).join(", ");
}
export async function parseSource(source:any){
 const p=await simpleParser(source);
 return {
  subject:p.subject||"(no subject)",from:addr(p.from),to:addr(p.to),cc:addr(p.cc),
  date:p.date?.toISOString()||null,messageId:p.messageId||null,
  inReplyTo:Array.isArray(p.inReplyTo)?p.inReplyTo.join(" "):(p.inReplyTo||null),
  references:Array.isArray(p.references)?p.references.join(" "):(p.references||null),
  text:p.text||"",html:typeof p.html==="string"?p.html:"",
  attachments:(p.attachments||[]).map((a:any)=>({filename:a.filename||"attachment",contentType:a.contentType,size:a.size||0,cid:a.cid||null}))
 };
}
export async function findMailbox(client:ImapFlow,kind:"sent"|"inbox"){
 if(kind==="inbox")return "INBOX";
 const boxes:any[]=await client.list();
 const special=boxes.find((b:any)=>String(b.specialUse||"").toLowerCase()==="\\sent");
 if(special)return special.path;
 const byName=boxes.find((b:any)=>/(^|\/)(sent|sent items|sent messages)$/i.test(b.path));
 return byName?.path||"INBOX";
}
