import Image from "next/image";
import Link from "next/link";
import { liveNav, primaryCta } from "@/lib/site/navigation";
import { MenuButton } from "./MenuButton";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap">
        <Link className="logo" href="/" aria-label="Kontorcompaniet – til forsiden">
          <Image src="/logo.png" alt="Kontorcompaniet" width={164} height={26} priority />
        </Link>
        <nav className="mainnav" id="hovedmeny" aria-label="Hovedmeny">
          {liveNav().map((item) => (
            <Link key={item.href} href={item.href}>{item.label}</Link>
          ))}
        </nav>
        <Link className="btn btn-primary header-cta" href={primaryCta.href}>{primaryCta.label}</Link>
        <MenuButton />
      </div>
    </header>
  );
}
