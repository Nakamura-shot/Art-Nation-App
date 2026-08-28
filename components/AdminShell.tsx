
import Link from "next/link";
import { ReactNode } from "react";
import AdminLogout from "./AdminLogout";

const nav = [
  { section: "", items: [["▦","Dashboard","/admin"]] },
  { section: "EVENTS", items: [["▣","Events","/admin/events"],["▤","Create event","/admin/events/new"],["⌖","Locations","/admin/locations"],["▧","Painting Library","/admin/paintings"],["⌁","Techniques","/admin/techniques"],["⌗","Guide Access","/admin/access-codes"],["▦","Event QR","/admin/event-access"]] },
  { section: "BOOKINGS", items: [["♧","Bookings","/admin/bookings"],["◎","Customers","/admin/customers"],["✉","Communications","/admin/communications"],["＠","Email","/admin/email"],["▤","Payments","#"],["▥","Reports","#"]] },
  { section: "SETTINGS", items: [["◇","Coupons","#"],["♙","Users","#"],["⚙","Settings","#"]] },
];

export default function AdminShell({children, active="Dashboard"}:{children:ReactNode; active?:string}) {
  return <div className="admin-app">
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-logo"><span>Art Nation</span><small>CEBU</small></Link>
      <nav className="admin-nav">
        {nav.map((group,gi)=><div className="admin-nav-group" key={gi}>
          {group.section && <div className="admin-nav-label">{group.section}</div>}
          {group.items.map(([icon,label,href])=>{
            const disabled=href==="#";
            return disabled
              ? <span key={label} className="admin-nav-item disabled" title="Coming soon"><b>{icon}</b>{label}<em>Soon</em></span>
              : <Link key={label} href={href} className={`admin-nav-item ${active===label?"active":""}`}><b>{icon}</b>{label}</Link>
          })}
        </div>)}
      </nav>
      <div className="admin-sidebar-bottom">
        <div className="admin-location-card">
          <b>Art Nation Cebu</b>
          <span>Eagle's Nest Condominium</span>
          <span>Canduman, Mandaue City</span>
        </div>
        <AdminLogout/>
      </div>
    </aside>
    <div className="admin-workspace">{children}</div>
  </div>
}
