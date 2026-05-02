"use client";

import { joinGame, submitAnswer } from "@/lib/actions";
import { AVATAR_EMOJI } from "@/lib/avatars";

const BOTS_KEY = "second_guess.bots";

export interface BotPlayer {
  id: string;
  name: string;
  avatar: string;
}

const BOT_NAME_POOL = [
  "Robo",
  "Nibbles",
  "Pixel",
  "Tofu",
  "Beep",
  "Boop",
  "Doodle",
  "Zigzag",
  "Mochi",
  "Cosmo",
  "Pip",
  "Sprout",
  "Twiggy",
  "Marble",
  "Whisker",
  "Ziggy",
  "Plinko",
  "Squeak",
  "Pebble",
  "Banjo",
];

/** Last-resort generic answers when no topic profile matches the prompt. */
const GENERIC_POOL = [
  "Pizza",
  "Cookie",
  "Apple",
  "Cheese",
  "Coffee",
  "Music",
  "Family",
  "Sleep",
];
const GENERIC_HEAVY = ["Pizza", "Cookie"];

interface Topic {
  match: RegExp;
  /** ~60% chance — picks the obvious answers so ties cluster. */
  heavy: string[];
  /** Remaining ~40% — adds variety. */
  pool: string[];
}

/**
 * Topic profiles, ordered by specificity (more specific patterns first).
 * Each tries to match the question prompt; first hit wins. Heavy hitters
 * fire 60% of the time so the obvious answer naturally lands at #1.
 */
const TOPICS: Topic[] = [
  // ── kids / family ─────────────────────────────────────
  {
    match: /toddler.*toy|kid.*toy|favorite toy/i,
    heavy: ["Lego", "Teddy bear", "Doll"],
    pool: ["Lego", "Teddy bear", "Doll", "Ball", "Blocks", "Truck", "Stuffy", "Puzzle", "Bunny", "Crayon"],
  },
  {
    match: /up their nose|kid.*nose/i,
    heavy: ["Bead", "Lego"],
    pool: ["Bead", "Lego", "Marble", "Pea", "Crayon", "Pencil", "Booger"],
  },
  {
    match: /baby.*first word|first word/i,
    heavy: ["Mama", "Dada"],
    pool: ["Mama", "Dada", "Hi", "No", "Dog", "Bye", "Ball"],
  },
  {
    match: /vegetable.*hate/i,
    heavy: ["Broccoli", "Brussels sprouts"],
    pool: ["Broccoli", "Brussels sprouts", "Peas", "Spinach", "Asparagus", "Cauliflower"],
  },
  {
    match: /nursery rhyme/i,
    heavy: ["Twinkle Twinkle", "Mary Had a Little Lamb"],
    pool: ["Twinkle Twinkle", "Mary Had a Little Lamb", "Itsy Bitsy Spider", "Old MacDonald", "Humpty Dumpty", "Hickory Dickory Dock"],
  },
  {
    match: /children.*book|kids.*book/i,
    heavy: ["Goodnight Moon", "Hungry Caterpillar"],
    pool: ["Goodnight Moon", "Hungry Caterpillar", "Cat in the Hat", "Where the Wild Things Are", "Brown Bear Brown Bear", "The Giving Tree"],
  },
  {
    match: /halloween costume/i,
    heavy: ["Ghost", "Witch"],
    pool: ["Ghost", "Witch", "Princess", "Superhero", "Pumpkin", "Vampire", "Pirate"],
  },
  {
    match: /diaper bag/i,
    heavy: ["Diapers", "Wipes"],
    pool: ["Diapers", "Wipes", "Bottle", "Pacifier", "Change of clothes", "Burp cloth", "Toy"],
  },
  {
    match: /breakfast cereal|kids.*cereal/i,
    heavy: ["Cheerios", "Lucky Charms"],
    pool: ["Cheerios", "Lucky Charms", "Froot Loops", "Frosted Flakes", "Cinnamon Toast Crunch", "Cocoa Puffs", "Cap'n Crunch"],
  },
  {
    match: /baby animal/i,
    heavy: ["Puppy", "Kitten"],
    pool: ["Puppy", "Kitten", "Lamb", "Duckling", "Chick", "Calf", "Foal"],
  },
  {
    match: /pregnant.*crave|pregnant women/i,
    heavy: ["Pickles", "Ice cream"],
    pool: ["Pickles", "Ice cream", "Chocolate", "Sour candy", "Peanut butter", "Mac and cheese"],
  },
  {
    match: /playground/i,
    heavy: ["Swings", "Slide"],
    pool: ["Swings", "Slide", "Monkey bars", "Sandbox", "Seesaw", "Jungle gym"],
  },
  {
    match: /baby food/i,
    heavy: ["Bananas", "Apples"],
    pool: ["Bananas", "Apples", "Peas", "Sweet potato", "Carrots", "Pears"],
  },
  {
    match: /baby shower gift/i,
    heavy: ["Diapers", "Onesie"],
    pool: ["Diapers", "Onesie", "Blanket", "Bottle", "Stroller", "Stuffed animal", "Books"],
  },
  {
    match: /sing.*baby|baby.*sleep/i,
    heavy: ["Twinkle Twinkle", "Rock-a-bye Baby"],
    pool: ["Twinkle Twinkle", "Rock-a-bye Baby", "You Are My Sunshine", "Hush Little Baby", "Brahms' Lullaby"],
  },
  {
    match: /fictional baby/i,
    heavy: ["Stewie", "Maggie"],
    pool: ["Stewie", "Maggie", "Boss Baby", "Rugrats", "Baby Yoda"],
  },
  {
    match: /parents.*bribe|bribe.*kids/i,
    heavy: ["Candy", "Ice cream"],
    pool: ["Candy", "Ice cream", "Screen time", "Toys", "Dessert", "Stickers"],
  },
  {
    match: /parents say|say way too often/i,
    heavy: ["Because I said so", "No"],
    pool: ["Because I said so", "No", "Don't make me come over there", "Stop", "Be careful", "Not now"],
  },
  {
    match: /kid.*tv|kids.*tv/i,
    heavy: ["Bluey", "Paw Patrol"],
    pool: ["Bluey", "Paw Patrol", "Cocomelon", "Sesame Street", "Daniel Tiger", "Peppa Pig"],
  },
  {
    match: /drives parents insane|kid show/i,
    heavy: ["Cocomelon", "Caillou"],
    pool: ["Cocomelon", "Caillou", "Peppa Pig", "Paw Patrol", "Baby Shark"],
  },
  {
    match: /every 5 seconds|kid says/i,
    heavy: ["Why", "Mom"],
    pool: ["Why", "Mom", "No", "Mine", "Look", "Watch this"],
  },
  {
    match: /swore.*never|never say.*parent/i,
    heavy: ["Because I said so", "Wait till your dad gets home"],
    pool: ["Because I said so", "Wait till your dad gets home", "Don't make me turn this car around", "Ask your father", "When I was your age"],
  },
  {
    match: /toddler.*no|says.*no/i,
    heavy: ["Vegetables", "Bedtime"],
    pool: ["Vegetables", "Bedtime", "Bath", "Brushing teeth", "Shoes", "Coat"],
  },
  {
    match: /lunchbox/i,
    heavy: ["Sandwich", "Goldfish"],
    pool: ["Sandwich", "Goldfish", "Apple", "Juice box", "String cheese", "Cookie"],
  },
  {
    match: /rainy day/i,
    heavy: ["Library", "Movies"],
    pool: ["Library", "Movies", "Mall", "Museum", "Trampoline park", "Aquarium"],
  },
  {
    match: /favorite part of school/i,
    heavy: ["Recess", "Lunch"],
    pool: ["Recess", "Lunch", "Gym", "Art", "Music", "Field trips"],
  },
  {
    match: /profession.*kids|grow up/i,
    heavy: ["Doctor", "Astronaut"],
    pool: ["Doctor", "Astronaut", "Firefighter", "Teacher", "Police officer", "YouTuber", "Athlete"],
  },
  {
    match: /get in trouble/i,
    heavy: ["Lying", "Hitting"],
    pool: ["Lying", "Hitting", "Not listening", "Talking back", "Breaking something", "Sneaking snacks"],
  },
  {
    match: /hardest subject/i,
    heavy: ["Math", "Chemistry"],
    pool: ["Math", "Chemistry", "Calculus", "Physics", "Algebra", "Latin"],
  },
  {
    match: /sport.*rarely|rarely play/i,
    heavy: ["Cricket", "Curling"],
    pool: ["Cricket", "Curling", "Polo", "Fencing", "Lacrosse", "Rugby"],
  },
  {
    match: /chore.*kids|trick.*kids|chore/i,
    heavy: ["Dishes", "Laundry"],
    pool: ["Dishes", "Laundry", "Vacuuming", "Taking out trash", "Mowing", "Folding laundry"],
  },
  {
    match: /road trip snack/i,
    heavy: ["Goldfish", "Pretzels"],
    pool: ["Goldfish", "Pretzels", "Beef jerky", "Gum", "Sunflower seeds", "Trail mix"],
  },
  {
    match: /snack.*steal|secretly steal|halloween candy/i,
    heavy: ["Goldfish", "Halloween candy"],
    pool: ["Goldfish", "Halloween candy", "Fruit snacks", "Cheez-its", "Animal crackers", "Cookies", "Juice box"],
  },

  // ── pop culture ───────────────────────────────────────
  {
    match: /disney.*movie|disney/i,
    heavy: ["Frozen", "Lion King"],
    pool: ["Frozen", "Lion King", "Moana", "Aladdin", "Tangled", "Encanto", "Beauty and the Beast", "Cinderella", "Mulan", "The Little Mermaid"],
  },
  {
    match: /pixar/i,
    heavy: ["Toy Story", "Finding Nemo"],
    pool: ["Toy Story", "Finding Nemo", "Up", "Inside Out", "Monsters Inc", "Cars", "Coco", "Wall-E", "The Incredibles", "Ratatouille"],
  },
  {
    match: /marvel|superhero/i,
    heavy: ["Spider-Man", "Iron Man"],
    pool: ["Spider-Man", "Iron Man", "Captain America", "Hulk", "Thor", "Black Widow", "Wolverine", "Black Panther"],
  },
  {
    match: /sitcom/i,
    heavy: ["Friends", "The Office"],
    pool: ["Friends", "The Office", "Seinfeld", "Big Bang Theory", "Cheers", "How I Met Your Mother", "Parks and Rec"],
  },
  {
    match: /streaming service/i,
    heavy: ["Netflix", "Hulu"],
    pool: ["Netflix", "Hulu", "Disney+", "Prime", "HBO Max", "Apple TV+", "Peacock"],
  },
  {
    match: /netflix show/i,
    heavy: ["Stranger Things", "The Crown"],
    pool: ["Stranger Things", "The Crown", "Bridgerton", "Squid Game", "Wednesday", "Black Mirror", "Ozark"],
  },
  {
    match: /horror movie/i,
    heavy: ["The Shining", "It"],
    pool: ["The Shining", "It", "Halloween", "Scream", "Get Out", "The Conjuring", "A Nightmare on Elm Street"],
  },
  {
    match: /90s band|boy band/i,
    heavy: ["Backstreet Boys", "NSYNC"],
    pool: ["Backstreet Boys", "NSYNC", "Spice Girls", "Nirvana", "Boyz II Men", "TLC", "Hanson"],
  },
  {
    match: /song.*lyrics|everyone knows the lyrics/i,
    heavy: ["Bohemian Rhapsody", "Don't Stop Believing"],
    pool: ["Bohemian Rhapsody", "Don't Stop Believing", "Sweet Caroline", "Mr. Brightside", "Happy Birthday", "Wonderwall"],
  },

  // ── food & drink ──────────────────────────────────────
  {
    match: /fast food/i,
    heavy: ["McDonald's", "Taco Bell"],
    pool: ["McDonald's", "Taco Bell", "Burger King", "Wendy's", "Subway", "Chick-fil-A", "KFC", "Chipotle"],
  },
  {
    match: /pizza topping/i,
    heavy: ["Pepperoni", "Mushroom"],
    pool: ["Pepperoni", "Mushroom", "Sausage", "Onion", "Peppers", "Pineapple", "Olives", "Bacon"],
  },
  {
    match: /soda/i,
    heavy: ["Coke", "Pepsi"],
    pool: ["Coke", "Pepsi", "Sprite", "Dr Pepper", "Mountain Dew", "Root Beer", "Fanta"],
  },
  {
    match: /beer/i,
    heavy: ["Budweiser", "Coors"],
    pool: ["Budweiser", "Coors", "Miller", "Heineken", "Corona", "Stella", "Modelo"],
  },
  {
    match: /ice cream flavor/i,
    heavy: ["Vanilla", "Chocolate"],
    pool: ["Vanilla", "Chocolate", "Strawberry", "Mint chip", "Cookies and cream", "Rocky road", "Pistachio"],
  },
  {
    match: /sandwich/i,
    heavy: ["Ham", "Turkey"],
    pool: ["Ham", "Turkey", "Cheese", "Peanut butter", "Tuna", "BLT", "Grilled cheese"],
  },
  {
    match: /cuisine/i,
    heavy: ["Italian", "Mexican"],
    pool: ["Italian", "Mexican", "Chinese", "Japanese", "Indian", "Thai", "Greek"],
  },
  {
    match: /breakfast food|breakfast/i,
    heavy: ["Pancakes", "Eggs"],
    pool: ["Pancakes", "Eggs", "Bacon", "Toast", "Cereal", "Oatmeal", "Waffles"],
  },
  {
    match: /chip flavor|chip/i,
    heavy: ["BBQ", "Sour cream"],
    pool: ["BBQ", "Sour cream", "Salt and vinegar", "Cheddar", "Plain", "Jalapeño"],
  },
  {
    match: /cocktail/i,
    heavy: ["Margarita", "Mojito"],
    pool: ["Margarita", "Mojito", "Martini", "Old fashioned", "Gin and tonic", "Negroni", "Manhattan"],
  },

  // ── travel & places ───────────────────────────────────
  {
    match: /europe|european/i,
    heavy: ["France", "Italy"],
    pool: ["France", "Italy", "Germany", "Spain", "UK", "Greece", "Netherlands"],
  },
  {
    match: /us state/i,
    heavy: ["California", "Texas"],
    pool: ["California", "Texas", "Florida", "New York", "Ohio", "Pennsylvania", "Illinois"],
  },
  {
    match: /major city|^name a city|big city/i,
    heavy: ["New York", "Los Angeles"],
    pool: ["New York", "Los Angeles", "Chicago", "Paris", "London", "Tokyo", "Miami"],
  },
  {
    match: /island.*vacation|tropical/i,
    heavy: ["Hawaii", "Bahamas"],
    pool: ["Hawaii", "Bahamas", "Maldives", "Bali", "Maui", "Aruba", "Fiji"],
  },
  {
    match: /national park/i,
    heavy: ["Yellowstone", "Yosemite"],
    pool: ["Yellowstone", "Yosemite", "Grand Canyon", "Zion", "Acadia", "Glacier", "Olympic"],
  },
  {
    match: /spanish.speaking/i,
    heavy: ["Mexico", "Spain"],
    pool: ["Mexico", "Spain", "Argentina", "Colombia", "Peru", "Chile", "Cuba"],
  },
  {
    match: /postcard/i,
    heavy: ["Eiffel Tower", "Grand Canyon"],
    pool: ["Eiffel Tower", "Grand Canyon", "Statue of Liberty", "Big Ben", "Niagara Falls"],
  },
  {
    match: /pack first/i,
    heavy: ["Underwear", "Toothbrush"],
    pool: ["Underwear", "Toothbrush", "Phone charger", "Socks", "Passport", "Shampoo"],
  },

  // ── sports & games ────────────────────────────────────
  {
    match: /board game.*tears|ends in tears/i,
    heavy: ["Monopoly", "Risk"],
    pool: ["Monopoly", "Risk", "Sorry", "Uno", "Trouble", "Settlers of Catan"],
  },
  {
    match: /board game/i,
    heavy: ["Monopoly", "Scrabble"],
    pool: ["Monopoly", "Scrabble", "Clue", "Risk", "Sorry", "Catan", "Chess"],
  },
  {
    match: /card game/i,
    heavy: ["Poker", "Solitaire"],
    pool: ["Poker", "Solitaire", "Uno", "War", "Blackjack", "Go Fish", "Hearts"],
  },
  {
    match: /sport.*ball|with a ball/i,
    heavy: ["Football", "Basketball"],
    pool: ["Football", "Basketball", "Baseball", "Soccer", "Tennis", "Volleyball", "Golf"],
  },
  {
    match: /olympic/i,
    heavy: ["Swimming", "Gymnastics"],
    pool: ["Swimming", "Gymnastics", "Track", "Diving", "Skiing", "Figure skating"],
  },
  {
    match: /video game/i,
    heavy: ["Mario", "Minecraft"],
    pool: ["Mario", "Minecraft", "Fortnite", "Zelda", "Tetris", "Call of Duty", "Roblox"],
  },
  {
    match: /pro team.*root against|root against/i,
    heavy: ["Cowboys", "Yankees"],
    pool: ["Cowboys", "Yankees", "Lakers", "Patriots", "Duke", "Red Sox"],
  },
  {
    match: /sport/i,
    heavy: ["Football", "Basketball"],
    pool: ["Football", "Basketball", "Baseball", "Soccer", "Tennis", "Hockey", "Golf"],
  },

  // ── random ────────────────────────────────────────────
  {
    match: /kitchen appliance/i,
    heavy: ["Microwave", "Refrigerator"],
    pool: ["Microwave", "Refrigerator", "Oven", "Toaster", "Blender", "Dishwasher", "Coffee maker"],
  },
  {
    match: /holiday/i,
    heavy: ["Christmas", "Halloween"],
    pool: ["Christmas", "Halloween", "Thanksgiving", "Easter", "July 4th", "New Year's", "Valentine's"],
  },
  {
    match: /fruit/i,
    heavy: ["Apple", "Banana"],
    pool: ["Apple", "Banana", "Orange", "Strawberry", "Grape", "Watermelon", "Pineapple"],
  },
  {
    match: /piece of clothing|clothing/i,
    heavy: ["Shirt", "Pants"],
    pool: ["Shirt", "Pants", "Shoes", "Jacket", "Hat", "Socks", "Dress"],
  },
  {
    match: /garage sale/i,
    heavy: ["Old books", "Clothes"],
    pool: ["Old books", "Clothes", "Lamps", "Toys", "Kitchenware", "Furniture", "Records"],
  },
  {
    match: /junk drawer/i,
    heavy: ["Batteries", "Pens"],
    pool: ["Batteries", "Pens", "Rubber bands", "Screwdriver", "Takeout menus", "Random keys", "Tape"],
  },
  {
    match: /thing in.*bath|kid.*bath/i,
    heavy: ["Rubber duck", "Soap"],
    pool: ["Rubber duck", "Soap", "Bubbles", "Shampoo", "Toy boat", "Washcloth"],
  },
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function readBots(code: string): BotPlayer[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(BOTS_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, BotPlayer[]>;
    return map[code.toUpperCase()] ?? [];
  } catch {
    return [];
  }
}

function writeBots(code: string, bots: BotPlayer[]) {
  try {
    const raw = window.localStorage.getItem(BOTS_KEY);
    const map = (raw ? JSON.parse(raw) : {}) as Record<string, BotPlayer[]>;
    map[code.toUpperCase()] = bots;
    window.localStorage.setItem(BOTS_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function getBots(code: string): BotPlayer[] {
  return readBots(code);
}

export async function addBot(opts: {
  gameId: string;
  code: string;
}): Promise<BotPlayer> {
  const existing = readBots(opts.code);
  const taken = new Set(existing.map((b) => b.name.toLowerCase()));
  let name = "";
  for (let i = 0; i < 200; i++) {
    const base = pick(BOT_NAME_POOL);
    const candidate =
      i < BOT_NAME_POOL.length ? base : `${base} ${Math.floor(i / BOT_NAME_POOL.length) + 1}`;
    if (!taken.has(candidate.toLowerCase())) {
      name = candidate;
      break;
    }
  }
  if (!name) name = `Bot ${Date.now()}`;

  const avatar = pick(AVATAR_EMOJI);
  const id = crypto.randomUUID();
  await joinGame({ gameId: opts.gameId, playerId: id, name, avatar });
  const bot: BotPlayer = { id, name, avatar };
  writeBots(opts.code, [...existing, bot]);
  return bot;
}

export function removeAllBots(code: string) {
  writeBots(code, []);
}

export function pickBotAnswer(prompt: string): string {
  const topic = TOPICS.find((t) => t.match.test(prompt));
  const heavy = topic?.heavy ?? GENERIC_HEAVY;
  const pool = topic?.pool ?? GENERIC_POOL;
  // 60% chance of picking a "heavy hitter" so ties cluster around the
  // obvious answer.
  if (Math.random() < 0.6) return pick(heavy);
  return pick(pool);
}

export async function botAnswerNow(opts: {
  questionId: string;
  prompt: string;
  bot: BotPlayer;
}) {
  const text = pickBotAnswer(opts.prompt);
  try {
    await submitAnswer({
      questionId: opts.questionId,
      playerId: opts.bot.id,
      rawText: text,
    });
  } catch {
    // bot already answered or question closed — ignore
  }
}
