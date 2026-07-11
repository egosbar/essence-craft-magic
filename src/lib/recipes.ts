export type SpiritCategory = "Neutral" | "Whiskey" | "Rum" | "Brandy" | "Gin" | "Agave";

export interface Recipe {
  id: string;
  name: string;
  category: SpiritCategory;
  description: string;
  targetOG: number;
  targetFG: number;
  ingredients: { name: string; amount: string }[];
  yeast: string;
  fermentTemp: string;
  fermentDays: string;
  notes: string;
}

export const RECIPES: Recipe[] = [
  {
    id: "neutral-sugar",
    name: "Neutral Vodka Wash (Sugar)",
    category: "Neutral",
    description: "Clean, high-ABV sugar wash for stripping and rectifying into neutral spirit.",
    targetOG: 1.08,
    targetFG: 0.995,
    ingredients: [
      { name: "White sugar", amount: "6 kg" },
      { name: "Water (dechlorinated)", amount: "25 L" },
      { name: "DAP nutrient", amount: "20 g" },
      { name: "Epsom salt", amount: "10 g" },
    ],
    yeast: "Turbo yeast (48h) or DADY",
    fermentTemp: "20–28 °C",
    fermentDays: "5–7 days",
    notes: "Strip run first, then a slow spirit run through a reflux column. Cut heads generously; hearts collect above 92% ABV for a true neutral.",
  },
  {
    id: "corn-bourbon",
    name: "Corn Mash Bourbon",
    category: "Whiskey",
    description: "Classic bourbon mash bill — 70% corn, 20% rye, 10% malted barley.",
    targetOG: 1.065,
    targetFG: 1.0,
    ingredients: [
      { name: "Flaked/cracked corn", amount: "5.5 kg" },
      { name: "Rye (flaked)", amount: "1.5 kg" },
      { name: "Malted barley (2-row)", amount: "1 kg" },
      { name: "Water", amount: "30 L" },
    ],
    yeast: "DADY or whiskey yeast (WLP095)",
    fermentTemp: "24–28 °C",
    fermentDays: "5–8 days",
    notes: "Cook corn at 85 °C for 60 min, cool to 68 °C, add rye, then barley at 65 °C for 60 min conversion. Pot still, on-the-grain if possible. Age on charred American oak.",
  },
  {
    id: "all-malt-whiskey",
    name: "All-Malt Single Malt Wash",
    category: "Whiskey",
    description: "100% malted barley wash in the Scottish tradition.",
    targetOG: 1.062,
    targetFG: 1.005,
    ingredients: [
      { name: "Malted barley (2-row)", amount: "7 kg" },
      { name: "Water", amount: "28 L" },
    ],
    yeast: "Distiller's yeast (M1 or DistilaMax SR)",
    fermentTemp: "20–25 °C",
    fermentDays: "4–6 days",
    notes: "Single infusion mash at 65 °C, 60 min. Sparge, ferment on-grain or clear. Double pot distillation: stripping run then spirit run. Age on French or American oak.",
  },
  {
    id: "molasses-rum",
    name: "Molasses Rum Wash",
    category: "Rum",
    description: "Rich, funky rum wash using blackstrap molasses.",
    targetOG: 1.07,
    targetFG: 1.005,
    ingredients: [
      { name: "Blackstrap molasses", amount: "4 kg" },
      { name: "Brown sugar", amount: "2 kg" },
      { name: "Water", amount: "25 L" },
      { name: "Dunder (optional)", amount: "2–4 L" },
    ],
    yeast: "EC-1118 or rum yeast (WLP070)",
    fermentTemp: "26–32 °C",
    fermentDays: "7–14 days",
    notes: "Longer, warmer ferment develops esters. Pot distill for character; save the dunder pit for the next wash. Age in ex-bourbon oak or drink white.",
  },
  {
    id: "apple-brandy",
    name: "Apple Brandy (Applejack)",
    category: "Brandy",
    description: "Distilled from fermented apple cider.",
    targetOG: 1.055,
    targetFG: 1.0,
    ingredients: [
      { name: "Fresh apple cider (unpasteurized preferred)", amount: "25 L" },
      { name: "Sugar (optional to boost)", amount: "500 g" },
    ],
    yeast: "Wine yeast (Lalvin 71B or EC-1118)",
    fermentTemp: "15–20 °C",
    fermentDays: "10–21 days",
    notes: "Cool, slow ferment preserves fruit character. Pot distill twice. Rest on toasted oak for calvados-style depth.",
  },
  {
    id: "juniper-gin",
    name: "London Dry Gin Base",
    category: "Gin",
    description: "Rectified neutral spirit re-distilled with botanicals.",
    targetOG: 1.08,
    targetFG: 0.995,
    ingredients: [
      { name: "Neutral spirit 45% ABV", amount: "5 L" },
      { name: "Juniper berries", amount: "60 g" },
      { name: "Coriander seed", amount: "20 g" },
      { name: "Angelica root", amount: "8 g" },
      { name: "Orris root", amount: "4 g" },
      { name: "Citrus peel (lemon/orange)", amount: "12 g" },
    ],
    yeast: "N/A — re-distillation",
    fermentTemp: "N/A",
    fermentDays: "24h maceration",
    notes: "Macerate botanicals 24h in the pot, then run slowly. Discard first 50 ml as heads. Cut tails when ABV drops below 60%.",
  },
  {
    id: "agave-tequila",
    name: "Agave Wash (Tequila-style)",
    category: "Agave",
    description: "Cooked blue agave fermented into a mezcal/tequila-style wash.",
    targetOG: 1.06,
    targetFG: 1.0,
    ingredients: [
      { name: "Cooked agave (piña)", amount: "10 kg" },
      { name: "Water", amount: "20 L" },
    ],
    yeast: "Wild ferment or EC-1118",
    fermentTemp: "24–30 °C",
    fermentDays: "5–10 days",
    notes: "Slow roast piñas at 90 °C for 24h to convert inulin. Press, ferment on the fibers for mezcal character. Double pot distill.",
  },
];
