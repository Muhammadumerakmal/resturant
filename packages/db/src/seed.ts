// Run with: npm run db:seed  (loads .env.local via tsx --env-file)
import { db } from "./index";
import {
  menuItems,
  restaurantSettings,
  staffMembers,
  reviews,
  promotions,
} from "./schema";

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

  // ── International expansion ──────────────────────────────────────────────
  // Starters
  {
    name: "Bruschetta",
    description: "Toasted sourdough with tomato, basil and olive oil",
    priceCents: 650,
    category: "starter",
    tags: ["vegetarian"],
  },
  {
    name: "Spring Rolls",
    description: "Crispy vegetable rolls with sweet chili dip",
    priceCents: 600,
    category: "starter",
    tags: ["vegetarian"],
  },
  {
    name: "Hummus & Pita",
    description: "Creamy chickpea hummus with warm pita bread",
    priceCents: 700,
    category: "starter",
    tags: ["vegetarian"],
  },
  {
    name: "Buffalo Chicken Wings",
    description: "Spicy fried wings tossed in hot sauce with blue cheese dip",
    priceCents: 900,
    category: "starter",
    tags: ["spicy"],
  },

  // Mains
  {
    name: "Margherita Pizza",
    description: "Wood-fired pizza with mozzarella, tomato and fresh basil",
    priceCents: 1200,
    category: "main",
    tags: ["vegetarian"],
  },
  {
    name: "Spaghetti Carbonara",
    description: "Pasta in a creamy egg sauce with pancetta and pecorino",
    priceCents: 1400,
    category: "main",
    tags: [],
  },
  {
    name: "Classic Beef Burger",
    description: "Grilled beef patty, cheddar, lettuce and tomato in a brioche bun",
    priceCents: 1350,
    category: "main",
    tags: [],
  },
  {
    name: "Chicken Shawarma Plate",
    description: "Marinated chicken with garlic sauce, pickles and flatbread",
    priceCents: 1250,
    category: "main",
    tags: ["spicy"],
  },
  {
    name: "Pad Thai",
    description: "Stir-fried rice noodles with peanuts, egg and tamarind",
    priceCents: 1300,
    category: "main",
    tags: ["spicy"],
  },
  {
    name: "Grilled Salmon",
    description: "Atlantic salmon fillet with lemon butter and greens",
    priceCents: 1800,
    category: "main",
    tags: ["gluten-free"],
  },
  {
    name: "Fish & Chips",
    description: "Beer-battered cod with thick-cut fries and tartar sauce",
    priceCents: 1500,
    category: "main",
    tags: [],
  },
  {
    name: "Chicken Fajitas",
    description: "Sizzling chicken with peppers, onions and warm tortillas",
    priceCents: 1450,
    category: "main",
    tags: ["spicy"],
  },

  // Sides
  {
    name: "French Fries",
    description: "Golden crispy fries with a pinch of sea salt",
    priceCents: 450,
    category: "side",
    tags: ["vegetarian"],
  },
  {
    name: "Garden Salad",
    description: "Mixed greens, cucumber and tomato with vinaigrette",
    priceCents: 550,
    category: "side",
    tags: ["vegetarian", "gluten-free"],
  },
  {
    name: "Steamed Rice",
    description: "Fluffy long-grain basmati rice",
    priceCents: 300,
    category: "side",
    tags: ["vegetarian", "gluten-free"],
  },
  {
    name: "Coleslaw",
    description: "Crunchy cabbage and carrot in a creamy dressing",
    priceCents: 400,
    category: "side",
    tags: ["vegetarian", "gluten-free"],
  },

  // Desserts
  {
    name: "Tiramisu",
    description: "Espresso-soaked ladyfingers with mascarpone cream",
    priceCents: 700,
    category: "dessert",
    tags: ["vegetarian"],
  },
  {
    name: "Chocolate Lava Cake",
    description: "Warm molten chocolate cake with a soft center",
    priceCents: 750,
    category: "dessert",
    tags: ["vegetarian"],
  },
  {
    name: "New York Cheesecake",
    description: "Rich baked cheesecake with a graham cracker crust",
    priceCents: 700,
    category: "dessert",
    tags: ["vegetarian"],
  },
  {
    name: "Ice Cream Sundae",
    description: "Vanilla ice cream with chocolate sauce and nuts",
    priceCents: 550,
    category: "dessert",
    tags: ["vegetarian", "gluten-free"],
  },

  // Drinks
  {
    name: "Fresh Lemonade",
    description: "House-made lemonade with a hint of mint",
    priceCents: 350,
    category: "drink",
    tags: ["vegetarian", "gluten-free"],
  },
  {
    name: "Iced Coffee",
    description: "Chilled brewed coffee over ice",
    priceCents: 400,
    category: "drink",
    tags: ["vegetarian", "gluten-free"],
  },
  {
    name: "Coca-Cola",
    description: "Classic chilled soft drink",
    priceCents: 250,
    category: "drink",
    tags: ["vegetarian", "gluten-free"],
  },
  {
    name: "Green Tea",
    description: "Hot brewed green tea",
    priceCents: 300,
    category: "drink",
    tags: ["vegetarian", "gluten-free"],
  },
  {
    name: "Orange Juice",
    description: "Freshly squeezed orange juice",
    priceCents: 400,
    category: "drink",
    tags: ["vegetarian", "gluten-free"],
  },
];

async function seedMenu() {
  // Additive + idempotent: insert only items not already present (matched by
  // name). Lets `db:seed` top up an already-populated DB with new dishes, and
  // stays safe to re-run. (There's no unique constraint on name; matching by
  // name is a pragmatic key that avoids a migration.)
  const existing = await db.select({ name: menuItems.name }).from(menuItems);
  const existingNames = new Set(existing.map((row) => row.name));
  const missing = MENU.filter((item) => !existingNames.has(item.name));
  if (missing.length === 0) {
    console.log("Menu up to date — nothing to add.");
    return;
  }
  const inserted = await db.insert(menuItems).values(missing).returning({ id: menuItems.id });
  console.log(`Added ${inserted.length} menu items.`);
}

async function seedSettings() {
  const existing = await db
    .select({ id: restaurantSettings.id })
    .from(restaurantSettings)
    .limit(1);
  if (existing.length > 0) {
    console.log("Settings already seeded — skipping.");
    return;
  }
  await db.insert(restaurantSettings).values({
    name: "Umer Akmal Kitchen",
    tagline: "Modern Indian kitchen — order, dine, deliver.",
    phone: "+1 (555) 012-3456",
    email: "hello@tavola.example",
    address: "123 Saffron Street, Springfield",
    hours: "Mon–Sun · 11:00 – 23:00",
  });
  console.log("Seeded restaurant settings row.");
}

const STAFF = [
  { name: "Amelia Chen", email: "amelia@tavola.example", role: "owner" },
  { name: "Marco Rossi", email: "marco@tavola.example", role: "manager" },
  { name: "Priya Sharma", email: "priya@tavola.example", role: "kitchen" },
  { name: "Diego Fernández", email: "diego@tavola.example", role: "kitchen" },
  { name: "Sofia Nguyen", email: "sofia@tavola.example", role: "server" },
  { name: "Liam O'Brien", email: "liam@tavola.example", role: "server" },
];

async function seedStaff() {
  // Additive + idempotent: insert only emails not already present.
  const existing = await db
    .select({ email: staffMembers.email })
    .from(staffMembers);
  const existingEmails = new Set(existing.map((r) => r.email));
  const missing = STAFF.filter((s) => !existingEmails.has(s.email));
  if (missing.length === 0) {
    console.log("Staff up to date — nothing to add.");
    return;
  }
  await db.insert(staffMembers).values(missing);
  console.log(`Added ${missing.length} staff members.`);
}

const PROMOS = [
  {
    code: "WELCOME10",
    description: "10% off your first order",
    discountType: "percent",
    discountValue: 10,
  },
  {
    code: "FREEDELIVERY",
    description: "$5 off delivery orders",
    discountType: "fixed",
    discountValue: 500,
  },
  {
    code: "WEEKEND15",
    description: "15% off on weekends",
    discountType: "percent",
    discountValue: 15,
  },
];

async function seedPromotions() {
  const existing = await db.select({ code: promotions.code }).from(promotions);
  const existingCodes = new Set(existing.map((r) => r.code));
  const missing = PROMOS.filter((p) => !existingCodes.has(p.code));
  if (missing.length === 0) {
    console.log("Promotions up to date — nothing to add.");
    return;
  }
  await db.insert(promotions).values(missing);
  console.log(`Added ${missing.length} promotions.`);
}

const REVIEWS = [
  { name: "Jordan P.", rating: 5, comment: "Best butter chicken in town — will be back!", status: "published" },
  { name: "Aisha K.", rating: 5, comment: "Cozy spot, fast delivery, everything was hot.", status: "published" },
  { name: "Tom H.", rating: 4, comment: "Great food, the AI ordering chat is surprisingly good.", status: "published" },
  { name: "Grace L.", rating: 4, comment: "Lovely paneer tikka. Portions could be bigger.", status: "published" },
  { name: "Sam R.", rating: 3, comment: "Solid but the wait was a little long on a Friday.", status: "pending" },
];

async function seedReviews() {
  // Additive + idempotent: reviews have no natural key, so match on the demo
  // comment text to avoid inserting the same demo review twice on re-runs.
  const existing = await db.select({ comment: reviews.comment }).from(reviews);
  const existingComments = new Set(existing.map((r) => r.comment));
  const missing = REVIEWS.filter((r) => !existingComments.has(r.comment));
  if (missing.length === 0) {
    console.log("Reviews up to date — nothing to add.");
    return;
  }
  await db.insert(reviews).values(missing);
  console.log(`Added ${missing.length} reviews.`);
}

async function main() {
  await seedMenu();
  await seedSettings();
  await seedStaff();
  await seedPromotions();
  await seedReviews();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
