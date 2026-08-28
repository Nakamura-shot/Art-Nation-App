"use client";
import {useRouter} from "next/navigation";
export default function AdminLogout(){
 const router=useRouter();
 async function logout(){
  await fetch("/api/admin/logout",{method:"POST"});
  router.push("/admin/login");router.refresh();
 }
 return <button className="admin-logout" onClick={logout}>Sign out</button>
}