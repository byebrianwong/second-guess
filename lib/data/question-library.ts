// Curated library of questions a host can browse and add to their game.
// Each is a "Family Feud-style" prompt with a glaringly obvious #1 (so
// collusion fails) and a meaty cluster of plausible #2-#5s. Used by the
// "Browse all questions" panel on /host/new.

export interface QuestionCategory {
  name: string;
  questions: string[];
}

export const QUESTION_LIBRARY: QuestionCategory[] = [
  {
    name: "Pop culture",
    questions: [
      "Name a Disney movie.",
      "Name a Pixar movie.",
      "Name a Marvel superhero.",
      "Name a TV sitcom.",
      "Name a streaming service.",
      "Name a 90s band.",
      "Name a Netflix show.",
      "Name a horror movie.",
      "Name a song everyone knows the lyrics to.",
    ],
  },
  {
    name: "Food & drink",
    questions: [
      "Name a fast food chain.",
      "Name a pizza topping.",
      "Name a soda brand.",
      "Name a beer brand.",
      "Name an ice cream flavor.",
      "Name a sandwich filling.",
      "Name a cuisine you love.",
      "Name a breakfast food.",
      "Name a chip flavor.",
      "Name a cocktail.",
    ],
  },
  {
    name: "Travel & places",
    questions: [
      "Name a country in Europe.",
      "Name a US state.",
      "Name a major city.",
      "Name an island vacation spot.",
      "Name a national park.",
      "Name a Spanish-speaking country.",
      "Name a place you'd see on a postcard.",
      "Name something you pack first.",
    ],
  },
  {
    name: "Sports & games",
    questions: [
      "Name a sport.",
      "Name a board game.",
      "Name a card game.",
      "Name a sport played with a ball.",
      "Name an Olympic event.",
      "Name a video game.",
      "Name a pro team you root against.",
    ],
  },
  {
    name: "Kids & family",
    questions: [
      "Name a toddler's favorite toy.",
      "Name a baby's first word.",
      "Name a vegetable kids hate.",
      "Name a kids' TV show.",
      "Name a nursery rhyme.",
      "Name a children's book.",
      "Name a kids' Halloween costume.",
      "Name a thing a kid puts up their nose.",
      "Name something a kid says every 5 seconds.",
      "Name a kid show that drives parents insane.",
      "Name a phrase you swore you'd never say as a parent.",
    ],
  },
  {
    name: "Random",
    questions: [
      "Name a kitchen appliance.",
      "Name a holiday.",
      "Name a fruit.",
      "Name a chore nobody wants to do.",
      "Name a piece of clothing.",
      "Name something you'd find at a garage sale.",
      "Name a thing in your junk drawer.",
      "Name a board game that ends in tears.",
      "Name a road trip snack.",
    ],
  },
];
