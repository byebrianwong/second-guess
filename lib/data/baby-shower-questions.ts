export const BABY_SHOWER_QUESTIONS: string[] = [
  "Name a toddler's favorite toy.",
  "Name a Disney animated movie.",
  "Name a baby's first word.",
  "Name a vegetable kids hate.",
  "Name a nursery rhyme.",
  "Name a Pixar movie.",
  "Name something you'd find in a diaper bag.",
  "Name a kids' breakfast cereal.",
  "Name a kid's Halloween costume.",
  "Name a baby animal.",
  "Name a children's book.",
  "Name a thing parents bribe their kids with.",
  "Name a kid's TV show.",
  "Name something pregnant women crave.",
  "Name a thing you'd see at a playground.",
  "Name a flavor of baby food.",
  "Name a baby shower gift.",
  "Name a song you'd sing a baby to sleep with.",
  "Name a famous fictional baby.",
  "Name a snack a parent secretly steals from their kid.",
  "Name something parents say way too often.",
  "Name a place parents take kids on a rainy day.",
  "Name something on a kid's lunchbox.",
  "Name a chore parents trick their kids into doing.",
  "Name a thing in a kid's bath.",
];

// Curated 11-question pack used by the temporary party-mode HOST/BABY flow.
// (See lib/actions.ts → getOrCreateBabyHost.)
export const BABY_SHOWER_PARTY_QUESTIONS: string[] = [
  "Name a Disney movie.",
  "Name a baby's first word.",
  "Name something kids get in trouble for.",
  "Name a kids' breakfast cereal.",
  "Name the hardest subject in school.",
  "Name a sport kids rarely play.",
  "Name a road trip snack.",
  "Name something a toddler says \"no\" to.",
  "Name the best holiday.",
  "Name a kids' favorite part of school.",
  "Name a profession kids want to be when they grow up.",
];

// 10 general-purpose questions for non-themed parties. Each has a glaringly
// obvious #1 (so collusion fails) and a meaty cluster of plausible #2-#5s.
export const GENERAL_STARTER_QUESTIONS: string[] = [
  "Name a fast food chain.",
  "Name a US state.",
  "Name a Marvel superhero.",
  "Name a board game.",
  "Name a fruit.",
  "Name a sport.",
  "Name a soda brand.",
  "Name a kitchen appliance.",
  "Name a country in Europe.",
  "Name a holiday.",
];

export const STARTER_PACKS: Record<string, string[]> = {
  baby_shower: BABY_SHOWER_QUESTIONS,
  baby_shower_party: BABY_SHOWER_PARTY_QUESTIONS,
  general: GENERAL_STARTER_QUESTIONS,
};
