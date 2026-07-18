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

export const designerSuggestions = ['Alaïa','Balenciaga','Burberry','Celine','Chanel','Christian Dior','Claudie Pierlot','COS','Esprit','Fendi','Givenchy','Gucci','Guess','H&M','Hermès','Isabel Marant','Loewe','Louis Vuitton','Maje','Mango','Marc O\'Polo','Massimo Dutti','Max Mara','Michael Kors','Miu Miu','Moncler','Prada','Ralph Lauren','Reiss','Saint Laurent','Sandro','Sézane','Tommy Hilfiger','Uniqlo','Valentino','Versace','Zara'];
export type CategoryName = keyof typeof categories;
