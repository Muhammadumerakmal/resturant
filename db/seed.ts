// Run with: npm run db:seed  (loads .env.local via tsx --env-file)
import { db } from "./index";
import { menuItems } from "./schema";

const MENU = [
  {
    name: "Garlic Naan",
    description: "Tandoor-baked flatbread brushed with garlic butter",
    priceCents: 350,
    category: "starter",
    tags: ["vegetarian"],
  },
  {
    name: "Vegetable Samosa",
    description: "Crispy pastry filled with spiced potato and peas",
    priceCents: 500,
    category: "starter",
    tags: ["vegetarian", "spicy"],
  },
  {
    name: "Chicken Tikka",
    description: "Char-grilled marinated chicken skewers",
    priceCents: 850,
    category: "starter",
    tags: ["spicy", "gluten-free"],
  },
  {
    name: "Butter Chicken",
    description: "Tandoori chicken in a creamy tomato gravy",
    priceCents: 1450,
    category: "main",
    tags: [],
  },
  {
    name: "Paneer Tikka Masala",
    description: "Grilled cottage cheese in a spiced tomato sauce",
    priceCents: 1300,
    category: "main",
    tags: ["vegetarian", "spicy"],
  },
  {
    name: "Lamb Biryani",
    description: "Fragrant basmati rice layered with slow-cooked lamb",
    priceCents: 1650,
    category: "main",
    tags: ["spicy"],
  },
  {
    name: "Dal Tadka",
    description: "Yellow lentils tempered with cumin and garlic",
    priceCents: 950,
    category: "main",
    tags: ["vegetarian", "gluten-free"],
  },
  {
    name: "Gulab Jamun",
    description: "Warm milk dumplings in rose-cardamom syrup",
    priceCents: 500,
    category: "dessert",
    tags: ["vegetarian"],
  },
  {
    name: "Mango Lassi",
    description: "Chilled yogurt smoothie with sweet mango",
    priceCents: 400,
    category: "dessert",
    tags: ["vegetarian", "gluten-free"],
  },
];

async function main() {
  const existing = await db.select({ id: menuItems.id }).from(menuItems).limit(1);
  if (existing.length > 0) {
    console.log("Menu already seeded — skipping. (Clear menu_items to re-seed.)");
    return;
  }
  const inserted = await db.insert(menuItems).values(MENU).returning({ id: menuItems.id });
  console.log(`Seeded ${inserted.length} menu items.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
