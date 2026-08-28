import {NextResponse} from "next/server";
import {cookies} from "next/headers";
export async function POST(){
 const store=await cookies();
 store.delete("artnation_admin_token");
 store.delete("artnation_admin_refresh");
 return NextResponse.json({ok:true});
}