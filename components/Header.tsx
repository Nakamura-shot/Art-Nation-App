import Link from "next/link";

export default function Header() {
  return (
    <header className="topbar">
      <Link href="/" className="brand">Art Nation Cebu</Link>
      <nav className="navlinks">
        <Link href="/">Events</Link>
        <Link href="/locations">Locations</Link>
        <Link href="/guides">Paintings</Link>
        <Link href="/techniques">Techniques</Link>
        <Link href="/messenger">Messenger Updates</Link>
        <Link href="/account">My Account</Link>
        <Link href="/admin/bookings">Admin</Link>
      </nav>
    </header>
  );
}
