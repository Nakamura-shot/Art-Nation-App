"use client";
import {useEffect,useState} from "react";

export default function AccountCallback(){
 const [message,setMessage]=useState("Signing you in…");
 useEffect(()=>{
  const hash=new URLSearchParams(window.location.hash.replace(/^#/,""));
  const access_token=hash.get("access_token"),refresh_token=hash.get("refresh_token"),expires_in=hash.get("expires_in");
  if(!access_token||!refresh_token){setMessage("This login link is invalid or has expired. Please request a new one.");return}
  fetch("/api/account/session",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({access_token,refresh_token,expires_in})}).then(async r=>{const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.error||"Could not sign in.");window.location.replace("/account")}).catch(e=>setMessage(e.message));
 },[]);
 return <main className="container account-page"><div className="account-card account-login-card"><h1>{message}</h1></div></main>
}
