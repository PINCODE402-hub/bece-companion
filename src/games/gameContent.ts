// These two games are vocabulary drills, not quizzes on stored past-question
// content — so unlike Speed Round (which pulls real published questions),
// their content is a small hand-curated list here, keyed by subject slug.
// XP for these games goes through award_game_xp() (see gamesService.ts),
// never a direct profile write.

export const MATCH_DATA: Record<string, { term: string; definition: string }[]> = {
  english: [
    { term: "Diligent", definition: "Hardworking" },
    { term: "Abundant", definition: "Plentiful" },
    { term: "Synonym", definition: "Word with similar meaning" },
    { term: "Antonym", definition: "Word with opposite meaning" },
    { term: "Adverb", definition: "Describes a verb" }
  ],
  maths: [
    { term: "LCM", definition: "Lowest Common Multiple" },
    { term: "Mode", definition: "Most frequent value" },
    { term: "Mean", definition: "Average of values" },
    { term: "Perimeter", definition: "Distance around a shape" },
    { term: "Area", definition: "Space inside a shape" }
  ],
  science: [
    { term: "Photosynthesis", definition: "Plants making food using sunlight" },
    { term: "Gills", definition: "Organs fish use to breathe" },
    { term: "Melting", definition: "Solid changing to liquid" },
    { term: "Chlorophyll", definition: "Green pigment in leaves" },
    { term: "Renewable energy", definition: "Energy source that doesn't run out" }
  ],
  social: [
    { term: "Constitution", definition: "Supreme law of the land" },
    { term: "Parliament", definition: "Body that makes laws" },
    { term: "Citizen", definition: "A legal member of a country" },
    { term: "Deforestation", definition: "Large-scale removal of trees" },
    { term: "Export", definition: "Goods sold to other countries" }
  ],
  rme: [
    { term: "Honesty", definition: "Telling the truth" },
    { term: "Qur'an", definition: "Holy book of Islam" },
    { term: "Sankofa", definition: "Go back and fetch what was lost" },
    { term: "Faithfulness", definition: "Being reliable and keeping promises" },
    { term: "Respect", definition: "Showing honour to others" }
  ],
  ict: [
    { term: "Hardware", definition: "Physical parts of a computer" },
    { term: "Software", definition: "Programs and instructions" },
    { term: "RAM", definition: "Temporary computer memory" },
    { term: "www", definition: "World Wide Web" },
    { term: "Input device", definition: "e.g. keyboard, mouse" }
  ],
  french: [
    { term: "Bonjour", definition: "Hello / Good morning" },
    { term: "Le livre", definition: "The book" },
    { term: "Merci", definition: "Thank you" },
    { term: "Ma mère", definition: "My mother" },
    { term: "Je suis", definition: "I am" }
  ],
  twi: [
    { term: "Nsuo", definition: "Water" },
    { term: "Meda wo ase", definition: "Thank you" },
    { term: "Ɔkyerɛkyerɛfoɔ", definition: "Teacher" },
    { term: "Me din de", definition: "My name is" },
    { term: "Sankofa", definition: "Go back and retrieve" }
  ]
};

export const SCRAMBLE_WORDS: Record<string, string[]> = {
  english: ["GRAMMAR", "VOCABULARY", "ESSAY", "SYNONYM"],
  maths: ["ALGEBRA", "FRACTION", "GEOMETRY", "NUMBER"],
  science: ["ENERGY", "PHOTOSYNTHESIS", "MATTER", "GRAVITY"],
  social: ["CITIZEN", "REGION", "RESOURCE", "ELECTION"],
  rme: ["HONESTY", "RESPECT", "VALUES", "FAITH"],
  ict: ["COMPUTER", "INTERNET", "SOFTWARE", "KEYBOARD"],
  french: ["BONJOUR", "MERCI", "ECOLE", "LIVRE"],
  twi: ["NSUO", "SANKOFA", "AKWAABA", "ADWUMA"]
};

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
