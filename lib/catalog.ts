export const categories = {
  Bekleidung: ['Blazer','Bluse','Hemd','Jacke','Kleid','Mantel','Pullover','Rock','Top','T-Shirt','Hose','Jeans','Jumpsuit','Overall','Weste','Strickjacke'],
  Taschen: ['Handtasche','Schultertasche','Umhängetasche','Clutch','Shopper','Rucksack','Reisetasche'],
  Schuhe: ['Pumps','Stiefelette','Stiefel','Sneaker','Loafer','Sandalen','Ballerina'],
  Accessoires: ['Schal','Tuch','Gürtel','Hut','Mütze','Sonnenbrille','Handschuhe','Schmuck','Uhr'],
} as const;

export const skuCodes: Record<string, string> = {
  Kleid:'KL', Bluse:'BL', Top:'TP', 'T-Shirt':'TS', Pullover:'PU', Strickjacke:'SJ', Jacke:'JA', Blazer:'BZ', Mantel:'MA', Hose:'HO', Jeans:'JE', Rock:'RK', Overall:'OV', Jumpsuit:'JS', Weste:'WE', Hemd:'HE',
  Handtasche:'HT', Schultertasche:'ST', Umhängetasche:'UT', Clutch:'CL', Shopper:'SH', Rucksack:'RS', Reisetasche:'RT',
  Pumps:'PM', Sandalen:'SA', Sneaker:'SN', Stiefel:'SF', Stiefelette:'SL', Loafer:'LO', Ballerina:'BA',
  Gürtel:'GT', Schal:'SC', Tuch:'TU', Handschuhe:'HS', Hut:'HU', Mütze:'MZ', Sonnenbrille:'SB', Schmuck:'SM', Uhr:'UH',
};

export const designerSuggestions = ['Alaïa','Balenciaga','Burberry','Celine','Chanel','Christian Dior','Fendi','Givenchy','Gucci','Hermès','Isabel Marant','Loewe','Louis Vuitton','Max Mara','Miu Miu','Moncler','Prada','Saint Laurent','Sandro','Valentino','Versace'];
export type CategoryName = keyof typeof categories;
