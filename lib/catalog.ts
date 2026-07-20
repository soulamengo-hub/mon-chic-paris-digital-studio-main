export const categories = {
  Bekleidung: ['Blazer','Bluse','Hemd','Jacke','Kleid','Mantel','Pullover','Rock','Top','T-Shirt','Hose','Jeans','Jumpsuit','Overall','Weste','Strickjacke'],
  Taschen: ['Handtasche','Schultertasche','Umhängetasche','Clutch','Shopper','Rucksack','Reisetasche'],
  Schuhe: ['Pumps','Stiefelette','Stiefel','Sneaker','Loafer','Sandalen','Ballerina'],
  Accessoires: ['Schal','Tuch','Gürtel','Hut','Mütze','Sonnenbrille','Handschuhe','Schmuck','Uhr'],
  // Start-Sortiment Wohnen/Deko. Bewusst noch schmal gehalten — weitere Unterkategorien
  // (z. B. Vasen, Bilderrahmen, Textilien) hier einfach ergänzen, sobald sie gebraucht werden.
  Wohnen: ['Spiegel','Lampe','Kerzenhalter'],
} as const;

export const skuCodes: Record<string, string> = {
  Kleid:'KL', Bluse:'BL', Top:'TP', 'T-Shirt':'TS', Pullover:'PU', Strickjacke:'SJ', Jacke:'JA', Blazer:'BZ', Mantel:'MA', Hose:'HO', Jeans:'JE', Rock:'RK', Overall:'OV', Jumpsuit:'JS', Weste:'WE', Hemd:'HE',
  Handtasche:'HT', Schultertasche:'ST', Umhängetasche:'UT', Clutch:'CL', Shopper:'SH', Rucksack:'RS', Reisetasche:'RT',
  Pumps:'PM', Sandalen:'SA', Sneaker:'SN', Stiefel:'SF', Stiefelette:'SL', Loafer:'LO', Ballerina:'BA',
  Gürtel:'GT', Schal:'SC', Tuch:'TU', Handschuhe:'HS', Hut:'HU', Mütze:'MZ', Sonnenbrille:'SB', Schmuck:'SM', Uhr:'UH',
  Spiegel:'SP', Lampe:'LA', Kerzenhalter:'KH',
};

export const designerSuggestions = ['Alaïa','A.P.C.','Balenciaga','Burberry','Celine','Chanel','Christian Dior','Comptoir des Cotonniers','Cop.Copine','Fendi','Gérard Darel','Givenchy','Gucci','Hermès','Imperial','Isabel Marant','Kookaï','Loewe','Louis Vuitton','Max Mara','Miu Miu','Moncler','Prada','Saint Laurent','Sandro','Valentino','Versace'];
export type CategoryName = keyof typeof categories;

// Kontrollierter Farbkatalog (6.5.7): Die KI darf nur diese Werte für Haupt-/Nebenfarbe
// vorschlagen. Ein zusätzlicher Freitext-Hinweis (z. B. "Dunkelblau mit roten Streifen")
// wird separat in color_note gespeichert, ohne den kontrollierten Wert zu ersetzen.
export const colorCatalog = ['Schwarz','Weiß','Beige','Braun','Blau','Rot','Grün','Grau','Rosa','Violett','Gold','Silber','Mehrfarbig'] as const;
export type ColorName = typeof colorCatalog[number];

// MON-CHIC-Stilrichtungen laut MC-04-04. Anzeige im Dropdown ohne Buchstaben-Code;
// intern wird der sprachneutrale "key" gespeichert (style_key-Spalte).
export const styleCatalog = [
  { key: 'parisian_classic', label: 'Parisian Classic (Classique Parisien)' },
  { key: 'quiet_elegance', label: 'Quiet Elegance (Élégance Discrète)' },
  { key: 'boho_romantic', label: 'Boho Romantic (Bohème Romantique)' },
  { key: 'vintage_floral', label: 'Vintage Floral (Fleuri Vintage)' },
  { key: 'rock_chic', label: 'Rock Chic' },
  { key: 'casual_sport', label: 'Casual Sport (Sportif Décontracté)' },
  { key: 'minimalist', label: 'Minimalist (Minimaliste)' },
  { key: 'preppy_academia', label: 'Preppy Academia (Preppy Académique)' },
  { key: 'evening_glam', label: 'Evening Glam (Glamour du Soir)' },
] as const;
export type StyleKey = typeof styleCatalog[number]['key'];
