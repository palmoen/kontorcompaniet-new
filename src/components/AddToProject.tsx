"use client";

import { useSyncExternalStore } from "react";
import { projectList, type ListItem } from "@/lib/client/project-list";

export function AddToProject({ item }: { item: ListItem }) {
  const items = useSyncExternalStore(projectList.subscribe, projectList.getSnapshot, projectList.getServerSnapshot);
  const added = items.some((i) => i.slug === item.slug);
  return (
    <button type="button" className="btn-add" aria-pressed={added} onClick={() => projectList.toggle(item)}>
      {added ? "Lagt til i prosjekt" : "Legg til i prosjekt"}
    </button>
  );
}

/** Lenke i headeren når listen ikke er tom */
export function ProjectListLink() {
  const items = useSyncExternalStore(projectList.subscribe, projectList.getSnapshot, projectList.getServerSnapshot);
  if (!items.length) return null;
  return (
    <a className="list-link" href="/kontakt#prosjektliste">
      Prosjektliste <span className="count">{items.length}</span>
    </a>
  );
}

/** «Be om tilbud» på et produktkort: legger produktet i prosjektlisten og går til skjemaet */
export function QuoteButton({ item, target = "#foresporsel" }: { item: ListItem; target?: string }) {
  return (
    <a
      className="btn btn-secondary btn-sm"
      href={target}
      onClick={() => {
        if (!projectList.getSnapshot().some((i) => i.slug === item.slug)) projectList.toggle(item);
      }}
    >
      Be om tilbud
    </a>
  );
}
