"use client";

import { useEffect, useRef, useState } from "react";

/** Eneste klientkomponent i headeren: åpner/lukker mobilmenyen, og lukker den når en lenke velges */
export function MenuButton() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const header = ref.current?.closest(".site-header");
    if (!header) return;
    header.setAttribute("data-open", String(open));
    const onClick = (e: Event) => { if ((e.target as HTMLElement).closest("a")) setOpen(false); };
    header.addEventListener("click", onClick);
    return () => header.removeEventListener("click", onClick);
  }, [open]);

  return (
    <button ref={ref} type="button" className="menu-btn" aria-expanded={open} aria-controls="hovedmeny" onClick={() => setOpen(!open)}>
      {open ? "Lukk" : "Meny"}
    </button>
  );
}
