"use client";

import { useState } from "react";

/** Eneste klientkomponent i headeren: åpner/lukker mobilmenyen */
export function MenuButton() {
  const [open, setOpen] = useState(false);
  return (
    <button
      type="button"
      className="menu-btn"
      aria-expanded={open}
      aria-controls="hovedmeny"
      onClick={(e) => {
        const next = !open;
        setOpen(next);
        e.currentTarget.closest(".site-header")?.setAttribute("data-open", String(next));
      }}
    >
      {open ? "Lukk" : "Meny"}
    </button>
  );
}
