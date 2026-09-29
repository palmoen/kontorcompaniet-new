import { ProposalDemo } from "./ProposalDemo";

/**
 * «Et tilbud dere kan se»: forklarer det digitale tilbudet med en interaktiv demo
 * (rom for rom, klikkbare punkter i rombildene, samlet økonomi, kommentarer og godkjenning).
 */
const points = [
  ["Se løsningen, rom for rom", "Møblene vises i rommene de skal stå i, med klikkbare punkter i bildene. Det er lettere å se helheten, og å se hva som mangler."],
  ["Hele økonomien samlet", "Møbler, frakt og montering på ett sted, og et anslag på leasing når det er aktuelt."],
  ["Kommenter der dere lurer på noe", "Trykk i bildet og skriv spørsmålet der det hører hjemme. Vi svarer og oppdaterer tilbudet."],
  ["Dere bestemmer tempoet", "Del lenken med dem som skal være med på beslutningen, og godkjenn digitalt når dere er klare."],
] as const;

export function ProposalShowcase({ headingId = "h-tilbud" }: { headingId?: string }) {
  return (
    <section className="band proposal" aria-labelledby={headingId}>
      <div className="wrap proposal-inner">
        <div className="proposal-head">
          <h2 id={headingId}>Et tilbud dere kan se, ikke bare lese</h2>
          <p className="lead">
            Dere får tilbudet som en egen nettside, bygget opp rom for rom. Det gir oversikt, og det gjør det enklere å være med på å
            forme løsningen underveis. Prøv selv: velg et rom, trykk på møblene eller legg inn en kommentar.
          </p>
        </div>
        <ProposalDemo />
        <ol className="proposal-points">
          {points.map(([t, d]) => <li key={t}><h3>{t}</h3><p>{d}</p></li>)}
        </ol>
      </div>
    </section>
  );
}
