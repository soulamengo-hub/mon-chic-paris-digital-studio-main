// MON CHIC PARIS · Digital Studio 6.5.7
// Pflegehinweise werden bewusst NICHT von der KI erzeugt, sondern regelbasiert
// aus dem Materialtext abgeleitet. Das ist zuverlässiger und verursacht keine
// zusätzlichen KI-Kosten. Der Nutzer kann das Ergebnis im Formular weiterhin
// frei überschreiben.

type Rule = { pattern: RegExp; instructions: string };

const rules: Rule[] = [
  { pattern: /seide/i, instructions: 'Nur Handwäsche oder chemische Reinigung. Nicht in den Trockner geben, vor direkter Sonne schützen.' },
  { pattern: /leder|veloursleder|nubuk/i, instructions: 'Nicht waschbar. Mit Lederpflegemittel behandeln, vor Nässe schützen, kühl und trocken lagern.' },
  { pattern: /kaschmir|cashmere/i, instructions: 'Handwäsche kalt oder Feinwäscheprogramm 30 °C. Liegend trocknen, nicht aufhängen.' },
  { pattern: /wolle/i, instructions: 'Feinwäsche bei maximal 30 °C oder chemische Reinigung. Liegend trocknen.' },
  { pattern: /viskose/i, instructions: 'Feinwäsche bei 30 °C, nicht schleudern. Liegend trocknen, feucht in Form ziehen.' },
  { pattern: /leinen/i, instructions: 'Maschinenwäsche bis 40 °C möglich. Bügeln bei mittlerer Temperatur, solange noch leicht feucht.' },
  { pattern: /baumwolle/i, instructions: 'Maschinenwäsche bei 30–40 °C. Bügeln bei mittlerer bis hoher Temperatur möglich.' },
  { pattern: /polyester|elasthan|nylon|synthetik|polyamid/i, instructions: 'Maschinenwäsche bei 30 °C, Schonwaschgang empfohlen. Nicht bügeln bei hoher Temperatur.' },
  { pattern: /denim|jeans/i, instructions: 'Waschen bei 30 °C auf links, um Farbabrieb zu vermeiden. Nicht mit hellen Textilien waschen.' },
  { pattern: /pelz|fell/i, instructions: 'Nicht waschbar. Nur professionelle Pelzreinigung, trocken und kühl lagern.' },
];

/**
 * Leitet aus einem freien Materialtext (z. B. "97% Baumwolle, 3% Elasthan")
 * einen Pflegehinweis ab. Bei mehreren erkannten Materialien werden die
 * passenden Hinweise kombiniert; ist kein Material erkennbar, wird ein
 * neutraler Standardhinweis zurückgegeben.
 */
export function deriveCareInstructions(material?: string | null): string {
  if (!material || !material.trim()) return '';
  const matches = rules.filter(rule => rule.pattern.test(material));
  if (matches.length === 0) return 'Kein Material eindeutig erkannt. Bitte Pflegeetikett im Artikel beachten.';
  const unique = Array.from(new Set(matches.map(rule => rule.instructions)));
  return unique.join(' ');
}
