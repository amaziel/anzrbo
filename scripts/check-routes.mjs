import { chromium } from "playwright";

const baseUrl = (process.env.ROUTE_CHECK_BASE_URL ?? "http://localhost:8080").replace(/\/$/, "");
const publicRoutes = [
  { path: "/", visible: "ANZRBO" },
  { path: "/print", visible: "Recherche membre" },
  { path: "/scanner", visible: "Scanner un QR Code" },
  { path: "/verifier/ANZRBO-2026-99747", visible: "Vérification" },
  { path: "/m/ANZRBO-2026-99747", visible: "Vérification" },
];
const protectedRoutes = ["/admin", "/admin/membres", "/admin/deces", "/admin/cotisations", "/admin/assistances"];
const viewports = [
  { name: "ordinateur", width: 1280, height: 1800 },
  { name: "mobile", width: 390, height: 844 },
];

const failures = [];
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    for (const route of publicRoutes) {
      pageErrors.length = 0;
      const response = await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle", timeout: 30_000 });
      const text = await page.locator("body").innerText().catch(() => "");
      const isBlank = text.trim().length < 20;
      const is404 = response?.status() === 404 || /Page introuvable/i.test(text);
      if (!response || response.status() >= 400 || is404 || isBlank || pageErrors.length || !text.includes(route.visible)) {
        failures.push(`${viewport.name} ${route.path}: HTTP ${response?.status() ?? "?"}, final=${page.url()}, blank=${isBlank}, erreurs=${pageErrors.join(" | ") || "aucune"}`);
      }
    }

    for (const path of protectedRoutes) {
      pageErrors.length = 0;
      const response = await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 30_000 });
      const text = await page.locator("body").innerText().catch(() => "");
      const redirectedToLogin = new URL(page.url()).pathname === "/login";
      if (!response || response.status() >= 400 || !redirectedToLogin || text.trim().length < 20 || pageErrors.length) {
        failures.push(`${viewport.name} ${path}: protection incorrecte, HTTP ${response?.status() ?? "?"}, final=${page.url()}, erreurs=${pageErrors.join(" | ") || "aucune"}`);
      }
    }
    await context.close();
  }
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Échec de la vérification des routes:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`Routes publiques et protégées valides sur mobile et ordinateur (${baseUrl}).`);