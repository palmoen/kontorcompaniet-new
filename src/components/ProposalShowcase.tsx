import Image from "next/image";

/**
 * «Slik ser tilbudet ut»: forklarer det digitale tilbudet (rom for rom, bilder, samlet
 * økonomi, kommentarer og godkjenning) med en illustrasjon. Illustrasjonen bruker egne
 * produktbilder og ingen kundenavn eller priser – den er merket som illustrasjon.
 */
const points = [
  ["Se løsningen, rom for rom", "Møblene vises med bilder i rommene de skal stå i, ikke som en lang produktliste. Det er lettere å se helheten, og å se hva som mangler."],
  ["Hele økonomien samlet", "Møbler, frakt og montering på ett sted, og et anslag på leasing når det er aktuelt. Opsjoner og alternativer holdes utenfor totalen, så dere ser hva som er hva."],
  ["Kommenter der dere lurer på noe", "Trykk i bildet og skriv spørsmålet der det hører hjemme, for eksempel en annen farge eller et annet bord. Vi svarer og oppdaterer tilbudet."],
  ["Dere bestemmer tempoet", "Del lenken med dem som skal være med på beslutningen, og godkjenn tilbudet digitalt når dere er klare."],
] as const;

const rooms = ["Landskap", "Møterom", "Kantine"];
const products = [
  { src: "/images/produkter/hag-futu-mesh-1100-s.webp", name: "HÅG Futu Mesh", note: "24 stk" },
  { src: "/images/produkter/dencon-delta-konferansebord.webp", name: "Dencon Delta", note: "1 stk" },
  { src: "/images/produkter/fora-form-bud-unite-konferansestol.webp", name: "Fora Form Bud Unite", note: "10 stk" },
];

export function ProposalShowcase({ headingId = "h-tilbud" }: { headingId?: string }) {
  return (
    <section className="band proposal" aria-labelledby={headingId}>
      <div className="wrap proposal-grid">
        <div className="proposal-text">
          <h2 id={headingId}>Et tilbud dere kan se, ikke bare lese</h2>
          <p className="lead">
            Dere får tilbudet som en egen nettside, bygget opp rom for rom. Det gir oversikt, og det gjør det enklere å være med på å
            forme løsningen underveis.
          </p>
          <ol className="proposal-points">
            {points.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
          </ol>
        </div>

        <figure className="proposal-figure">
          <div className="pv" aria-hidden="true">
            <div className="pv-bar"><span /><span /><span /><em>Tilbud · Nytt kontor</em></div>
            <div className="pv-body">
              <div className="pv-rooms">{rooms.map((r, i) => <span key={r} className={i === 1 ? "on" : undefined}>{r}</span>)}</div>
              <div className="pv-main">
                <div className="pv-products">
                  {products.map((p, i) => (
                    <div key={p.name} className="pv-card">
                      <div className="pv-img">
                        <Image src={p.src} alt="" fill sizes="180px" quality={60} />
                        {i === 1 && <i className="pv-pin">1</i>}
                      </div>
                      {i === 1 && <b className="pv-note">Går det an med eik i stedet for hvit?</b>}
                      <strong>{p.name}</strong>
                      <small>{p.note}</small>
                    </div>
                  ))}
                </div>
                <div className="pv-sum">
                  <div><span>Møbler</span><i /></div>
                  <div><span>Frakt og montering</span><i className="s" /></div>
                  <div className="tot"><span>Totalt eks. mva.</span><i /></div>
                  <div className="pv-lease"><span>Leasing, anslag per måned</span><i className="s" /></div>
                  <span className="pv-approve">Godkjenn tilbud</span>
                </div>
              </div>
            </div>
          </div>
          <figcaption>Illustrasjon. Et ekte tilbud viser deres rom, produkter og priser.</figcaption>
        </figure>
      </div>
    </section>
  );
}
