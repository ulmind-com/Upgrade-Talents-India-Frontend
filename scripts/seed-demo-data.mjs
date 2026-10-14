/**
 * Seeds one published event plus its ticket tiers through the Eventora admin API.
 * Nothing in the backend is modified — this only calls documented endpoints.
 *
 *   node scripts/seed-demo-data.mjs
 *
 * Env:
 *   API_BASE        default http://localhost:8000
 *   ADMIN_EMAIL     super-admin email
 *   ADMIN_PASSWORD  super-admin password
 */

const API = (process.env.API_BASE || "http://localhost:8000").replace(/\/$/, "");
const EMAIL = process.env.ADMIN_EMAIL || "";
const PASSWORD = process.env.ADMIN_PASSWORD || "";

async function call(path, { method = "GET", body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }

  if (!res.ok) {
    const detail = typeof data?.detail === "string" ? data.detail
      : Array.isArray(data?.detail) ? data.detail[0]?.msg
      : `HTTP ${res.status}`;
    throw new Error(`${method} ${path} failed — ${detail}`);
  }
  return data;
}

/* Ticket tiers mirroring the approved design: four packs, one highlighted. */
const TIERS = [
  { type: "1 CLASS",    price: 1000,  total_quantity: 400, display_order: 1 },
  { type: "10 CLASSES", price: 9000,  total_quantity: 300, display_order: 2 },
  { type: "20 CLASSES", price: 17000, total_quantity: 200, display_order: 3 },
  { type: "40 CLASSES", price: 34000, total_quantity: 120, display_order: 4 },
];

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD before running this script.");
    process.exit(1);
  }

  console.log(`→ API ${API}`);

  const { access_token: token } = await call("/api/admin/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  console.log("✓ signed in as super admin");

  const today = new Date();
  const eventDate = new Date(today.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  const event = await call("/api/admin/events", {
    method: "POST",
    token,
    body: {
      title: "Street Dance Class Pass",
      description:
        "A flexible system. Choose the best option and start your dance journey with us. " +
        "Every pack is valid across all open studio sessions for the season.",
      image_url: "https://images.unsplash.com/photo-1535525153412-5a42439a210d?auto=format&fit=crop&w=1600&q=80",
      date: eventDate,
      time: "7:30 PM",
      venue: "Kolkata · Studio Floor 2",
      capacity: 1020,
      price: 1000,
      event_status: "upcoming",
      is_published: true,
      is_visible: true,
      registration_enabled: true,
      ticket_enabled: true,
      display_order: 1,
    },
  });

  const eventId = String(event?._id ?? event?.id ?? event?.event_id ?? "");
  if (!eventId) throw new Error("Event was created but no id came back.");
  console.log(`✓ event created — ${eventId}`);

  for (const t of TIERS) {
    await call("/api/admin/tickets", {
      method: "POST",
      token,
      body: { ...t, event_id: eventId, available: t.total_quantity, is_visible: true },
    });
    console.log(`  ✓ tier ${t.type} — ₹${t.price}`);
  }

  console.log(`\nDone. Open the ticket page at /events/${eventId}/book`);
}

main().catch((e) => {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
});
