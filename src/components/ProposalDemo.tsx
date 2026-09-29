"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Interaktiv demo av det digitale tilbudet (samme oppbygning som i tilbudsverktøyet):
 * romliste → rombilde med klikkbare punkter → produktpanel, «Rom»/«Tilbud»-visning,
 * kommentarer i bildet og godkjenning. Alt er eksempeldata og lagres ikke.
 * Ingen enkeltpriser (ikke nettbutikk); romtotaler er merket som eksempel.
 */
type Product = { id: string; name: string; variant: string; qty: number; desc: string; at: { x: number; y: number } };
type Comment = { x: number; y: number; text: string; reply?: string };
type Room = { name: string; images: string[]; total: number; products: Product[]; comments: Comment[] };

const ROOMS: Room[] = [
  {
    name: "Kontorlandskap", images: ["/images/interior/landskap.webp", "/images/prosjekter/ice-nydalen.webp"], total: 486_000,
    products: [
      { id: "l1", name: "Kontorstol, polstret", variant: "Ullstoff cognac · lyst understell", qty: 24, desc: "Synkronvipp og justerbare armlener. Stilles inn for hver bruker ved montering.", at: { x: 49, y: 58 } },
      { id: "l2", name: "Arbeidsbord i rekke", variant: "Hev/senk · 160 × 80 cm · hvit laminat", qty: 12, desc: "Doble arbeidsplasser med felles kabelkanal og bordskjerm.", at: { x: 72, y: 56 } },
      { id: "l3", name: "Kafestol", variant: "Formpresset tre · gulbeis", qty: 8, desc: "Til de korte møtene ved langbordet.", at: { x: 20, y: 66 } },
      { id: "l4", name: "Pendel", variant: "Hvit metall · Ø 45 cm", qty: 6, desc: "Jevnt, blendfritt lys over arbeidsplassene.", at: { x: 35, y: 28 } },
    ],
    comments: [],
  },
  {
    name: "Møterom", images: ["/images/interior/konferanse.webp", "/images/interior/moterom.webp"], total: 142_000,
    products: [
      { id: "m1", name: "Møtebord", variant: "400 × 120 cm · sort linoleum", qty: 1, desc: "Kabelluke i midten med strøm og USB-C.", at: { x: 52, y: 58 } },
      { id: "m2", name: "Konferansestol med armlener", variant: "Skinn cognac · sort understell", qty: 12, desc: "Høy rygg og hjul. Stabler ikke, men tåler lange møter.", at: { x: 21, y: 72 } },
      { id: "m3", name: "Pendel over bordet", variant: "Sort tekstil · Ø 80 cm", qty: 1, desc: "Demper også lyd i rommet.", at: { x: 53, y: 17 } },
    ],
    comments: [{ x: 83, y: 62, text: "Kan vi få stolene i en mørkere farge?", reply: "Ja, vi legger inn mørk brun som alternativ." }],
  },
  {
    name: "Kantine", images: ["/images/interior/kantine.webp"], total: 118_000,
    products: [
      { id: "k1", name: "Kantinestol", variant: "Rosa skall · messingben", qty: 32, desc: "Lett å løfte, tåler daglig vask.", at: { x: 52, y: 72 } },
      { id: "k2", name: "Kantinebord", variant: "180 × 80 cm · sort laminat", qty: 8, desc: "Sentrert søyleben gir god plass til bena.", at: { x: 76, y: 64 } },
      { id: "k3", name: "Polstret benk", variant: "Langs veggen · ullstoff rosa", qty: 3, desc: "Tilpasset lengde etter oppmåling.", at: { x: 19, y: 58 } },
    ],
    comments: [],
  },
  {
    name: "Sosial sone", images: ["/images/interior/lounge.webp"], total: 64_000,
    products: [
      { id: "s1", name: "Sofa, 3-seter", variant: "Møbelstoff sand", qty: 2, desc: "Dype seter og avtakbart trekk.", at: { x: 30, y: 56 } },
      { id: "s2", name: "Sofabord", variant: "Organisk form · grå lakk", qty: 2, desc: "Lav høyde, passer til sofagruppen.", at: { x: 66, y: 76 } },
      { id: "s3", name: "Romdeler i metall", variant: "Grafitt · 2 moduler", qty: 2, desc: "Skiller sonen fra gangen uten å stenge lyset ute.", at: { x: 28, y: 16 } },
    ],
    comments: [],
  },
];

/** Boble på høyre side av punktet, eller venstre når punktet står langt til høyre */
const side = (x: number) => (x > 50 ? { right: `${100 - x + 3}%` } : { left: `${x + 3}%` });
const kr = (n: number) => `${n.toLocaleString("nb-NO")} kr`;
const TOTAL = ROOMS.reduce((s, r) => s + r.total, 0);
const LEASING = Math.round((TOTAL * 0.0195) / 100) * 100; // 60 mnd, eksempel

export function ProposalDemo() {
  const [roomIdx, setRoomIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [active, setActive] = useState<string | null>(null);
  const [view, setView] = useState<"rom" | "tilbud">("rom");
  const [commenting, setCommenting] = useState(false);
  const [draft, setDraft] = useState<{ x: number; y: number; text: string } | null>(null);
  const [added, setAdded] = useState<Record<number, Comment[]>>({});
  const [approved, setApproved] = useState(false);

  const room = ROOMS[roomIdx];
  const comments = [...room.comments, ...(added[roomIdx] ?? [])];
  const activeProduct = room.products.find((p) => p.id === active) ?? null;

  function selectRoom(i: number) {
    setRoomIdx(i); setImgIdx(0); setActive(null); setDraft(null); setCommenting(false); setView("rom");
  }
  function placeComment(e: React.MouseEvent<HTMLDivElement>) {
    if (!commenting) return;
    const r = e.currentTarget.getBoundingClientRect();
    setDraft({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100, text: "" });
  }
  function saveComment() {
    if (!draft?.text.trim()) { setDraft(null); return; }
    setAdded((a) => ({ ...a, [roomIdx]: [...(a[roomIdx] ?? []), { x: draft.x, y: draft.y, text: draft.text.trim() }] }));
    setDraft(null); setCommenting(false);
  }

  return (
    <div className="pd" role="region" aria-label="Eksempel på et digitalt tilbud">
      <div className="pd-top">
        <span className="pd-title">Tilbud · Nytt kontor, 3. etasje <em>Eksempel</em></span>
        <div className="pd-tabs" role="tablist" aria-label="Visning">
          <button role="tab" aria-selected={view === "rom"} className={view === "rom" ? "on" : ""} onClick={() => setView("rom")}>Rom</button>
          <button role="tab" aria-selected={view === "tilbud"} className={view === "tilbud" ? "on" : ""} onClick={() => setView("tilbud")}>Tilbud</button>
        </div>
      </div>

      <div className="pd-grid">
        <nav className="pd-rooms" aria-label="Rom">
          <p className="pd-label">Rom</p>
          <ul>
            {ROOMS.map((r, i) => (
              <li key={r.name}>
                <button className={i === roomIdx ? "on" : ""} aria-current={i === roomIdx ? "true" : undefined} onClick={() => selectRoom(i)}>
                  <span className="pd-thumb"><Image src={r.images[0]} alt="" fill sizes="160px" quality={50} /></span>
                  <span>{r.name}</span>
                </button>
              </li>
            ))}
          </ul>
          <div className="pd-grand"><p className="pd-label">Totalt</p><b>{kr(TOTAL)}</b></div>
        </nav>

        {view === "rom" ? (
          <>
            <div className="pd-stage">
              <div className={`pd-img${commenting ? " commenting" : ""}`} onClick={placeComment}>
                <Image key={room.images[imgIdx]} src={room.images[imgIdx]} alt={`${room.name}, eksempelbilde`} fill sizes="(max-width: 900px) 100vw, 60vw" quality={70} />
                <span className="pd-roomtotal">{kr(room.total)}</span>
                <div className="pd-roomname"><small>Rom {roomIdx + 1}</small><b>{room.name}</b></div>

                {imgIdx === 0 && room.products.map((p) => (
                  <button key={p.id} className={`pd-hs${active === p.id ? " on" : ""}`} style={{ left: `${p.at.x}%`, top: `${p.at.y}%` }}
                    aria-label={`Vis ${p.name} i bildet`} aria-pressed={active === p.id}
                    onClick={(e) => { e.stopPropagation(); if (!commenting) setActive(active === p.id ? null : p.id); }} />
                ))}
                {imgIdx === 0 && activeProduct && (
                  <div className="pd-pop" style={{ ...side(activeProduct.at.x), top: `${Math.max(activeProduct.at.y - 22, 4)}%` }}>
                    <b>{activeProduct.name}</b><span>{activeProduct.qty} stk · {activeProduct.variant}</span>
                  </div>
                )}

                {imgIdx === 0 && comments.map((c, i) => (
                  <div key={i} className={`pd-cm${c.x > 55 ? " flip" : ""}`} style={{ left: `${c.x}%`, top: `${c.y}%` }}>
                    <i>{i + 1}</i>
                    <div className="pd-cm-body"><p>{c.text}</p>{c.reply && <p className="reply"><b>Rådgiver:</b> {c.reply}</p>}</div>
                  </div>
                ))}
                {draft && (
                  <div className={`pd-cm draft${draft.x > 55 ? " flip" : ""}`} style={{ left: `${draft.x}%`, top: `${draft.y}%` }} onClick={(e) => e.stopPropagation()}>
                    <i>+</i>
                    <form className="pd-cm-body" onSubmit={(e) => { e.preventDefault(); saveComment(); }}>
                      <label className="sr-only" htmlFor="pd-draft">Kommentar</label>
                      <input id="pd-draft" autoFocus maxLength={120} placeholder="Skriv en kommentar" value={draft.text}
                        onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
                      <button type="submit">Lagre</button>
                    </form>
                  </div>
                )}
              </div>
              <div className="pd-stagebar">
                {room.images.length > 1 && (
                  <div className="pd-gallery" aria-label="Galleri">
                    {room.images.map((src, i) => (
                      <button key={src} className={i === imgIdx ? "on" : ""} aria-label={`Bilde ${i + 1}`} onClick={() => { setImgIdx(i); setDraft(null); }}>
                        <Image src={src} alt="" fill sizes="64px" quality={40} />
                      </button>
                    ))}
                  </div>
                )}
                <button className={`pd-comment${commenting ? " on" : ""}`} onClick={() => { setImgIdx(0); setDraft(null); setCommenting((c) => !c); }}>
                  {commenting ? "Trykk i bildet …" : "💬 Kommenter i bildet"}
                </button>
              </div>
            </div>

            <aside className="pd-panel" aria-label={`Produkter i ${room.name}`}>
              <p className="pd-label">Produkter · {room.name}</p>
              <ul>
                {room.products.map((p, i) => {
                  const open = active === p.id || (active === null && i === 0);
                  return (
                    <li key={p.id}>
                      <button className={open ? "open" : ""} aria-expanded={open} onClick={() => setActive(active === p.id ? null : p.id)}>
                        <span className="pos">{roomIdx + 1}.{i + 1}</span>
                        <strong>{p.name}</strong>
                        <span className="qty">{p.qty} stk</span>
                        {open && <span className="more"><span className="variant">{p.variant}</span><span>{p.desc}</span></span>}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="pd-foot">
                <div><span>Romtotal</span><b>{kr(room.total)}</b></div>
                <button className="pd-approve" onClick={() => setView("tilbud")}>Se hele tilbudet</button>
              </div>
            </aside>
          </>
        ) : (
          <div className="pd-summary">
            <table>
              <caption className="pd-label">Oversikt per rom</caption>
              <thead><tr><th scope="col">Rom</th><th scope="col" className="num">Produkter</th><th scope="col" className="num">Sum eks. mva.</th></tr></thead>
              <tbody>
                {ROOMS.map((r, i) => (
                  <tr key={r.name}><th scope="row"><button className="linkish" onClick={() => selectRoom(i)}>{r.name}</button></th>
                    <td className="num">{r.products.reduce((s, p) => s + p.qty, 0)} stk</td><td className="num">{kr(r.total)}</td></tr>
                ))}
                <tr className="muted-row"><th scope="row">Frakt, innbæring og montering</th><td /><td className="num">Inkludert</td></tr>
              </tbody>
              <tfoot><tr><th scope="row">Totalt eks. mva.</th><td /><td className="num">{kr(TOTAL)}</td></tr></tfoot>
            </table>
            <div className="pd-lease"><span>Leasing over 60 måneder, anslag</span><b>ca. {kr(LEASING)} / mnd</b></div>
            {approved ? (
              <p className="pd-done" role="status">✓ Godkjent. I et ekte tilbud får rådgiveren beskjed med én gang.</p>
            ) : (
              <button className="pd-approve big" onClick={() => setApproved(true)}>✓ Godkjenn tilbud</button>
            )}
            <p className="pd-fine">Eksempel. Rom, produkter og priser i et ekte tilbud avhenger av prosjektet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
