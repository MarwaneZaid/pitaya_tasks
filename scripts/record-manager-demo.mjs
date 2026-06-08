/**
 * Enregistre une courte démo vidéo DailyDo pour les managers (Playwright).
 * Prérequis : npm run dev sur http://localhost:5173
 */
import { chromium } from 'playwright';
import { mkdirSync, renameSync, existsSync } from 'fs';
import { join } from 'path';

const DEMO_DIR = join(process.cwd(), 'docs', 'demo');
const OUTPUT = join(DEMO_DIR, 'dailydo-demo-managers.mp4');
const BASE = process.env.DEMO_URL || 'http://localhost:5173';
const RESTO = process.env.DEMO_RESTO || 'Cafe Node20 Auth OK';
const PASS = process.env.DEMO_PASS || 'Node20Test2026!';

mkdirSync(DEMO_DIR, { recursive: true });

async function caption(page, text) {
  await page.evaluate((t) => {
    let el = document.getElementById('demo-caption');
    if (!el) {
      el = document.createElement('div');
      el.id = 'demo-caption';
      el.style.cssText =
        'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);z-index:99999;' +
        'background:rgba(15,23,42,0.94);color:#fff;padding:12px 22px;border-radius:12px;' +
        'font:600 17px/1.35 -apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;' +
        'max-width:92%;text-align:center;box-shadow:0 8px 28px rgba(0,0,0,0.35);pointer-events:none;';
      document.body.appendChild(el);
    }
    el.textContent = t;
  }, text);
}

async function wait(page, ms = 2800) {
  await page.waitForTimeout(ms);
}

async function safeClick(page, locator, opts = {}) {
  const el = typeof locator === 'string' ? page.locator(locator) : locator;
  if (await el.count()) {
    await el.first().click({ timeout: 8000, ...opts });
    return true;
  }
  return false;
}

const chromePaths = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
];
const executablePath = chromePaths.find((p) => existsSync(p));

const browser = await chromium.launch({
  headless: true,
  ...(executablePath ? { executablePath } : { channel: 'chrome' }),
});
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  recordVideo: { dir: DEMO_DIR, size: { width: 1280, height: 800 } },
  locale: 'fr-FR',
});
const page = await context.newPage();

try {
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  await caption(page, 'DailyDo — Guide manager : connexion avec le nom du restaurant');
  await wait(page, 3200);

  await page.getByPlaceholder('Ex: Pitaya Lyon').fill(RESTO);
  await page.getByPlaceholder('6 caractères min').fill(PASS);
  await wait(page, 1200);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await page.waitForSelector('header h1', { timeout: 90000 });
  await caption(page, 'Tableau de bord partagé — stats, sync temps réel, rôle Gérant');
  await wait(page, 3500);

  await caption(page, 'Les tâches du jour (planning) sont ajoutées automatiquement au chargement');
  await wait(page, 3200);

  const taskButtons = page.locator('li.bg-white.rounded-xl button');
  if (await taskButtons.count()) {
    await caption(page, 'Cliquer sur une tâche : À faire → En cours → Terminée');
    await taskButtons.first().click();
    await wait(page, 2000);
    await taskButtons.first().click();
    await wait(page, 2000);
  }

  await caption(page, 'Filtres : quotidien, annexe, par poste (cuisine, salle…)');
  await wait(page, 2800);

  await safeClick(page, page.getByRole('button', { name: /Nouvelle tâche/i }));
  await caption(page, 'Manager : ajouter une tâche ponctuelle (titre, priorité, assignation)');
  await wait(page, 3500);

  const planningBtn = page.getByRole('button', { name: /paramètres du planning|Planning/i });
  if (await planningBtn.count()) {
    await planningBtn.first().click();
    await caption(page, 'Gérant : configurer le planning nettoyage (lundi → dimanche)');
    await wait(page, 3200);
    await safeClick(page, page.getByRole('button', { name: /^Lundi$/i }));
    await wait(page, 2800);
    await safeClick(page, page.getByRole('button', { name: /^Mercredi$/i }));
    await wait(page, 2800);
    await safeClick(page, page.getByRole('button', { name: /Annuler|Fermer|^×$/ }).or(page.locator('button').filter({ has: page.locator('svg') }).nth(0)));
    const closePlanning = page.locator('button').filter({ hasText: '' }).locator('xpath=ancestor::div[contains(@class,"fixed")]//button').first();
    await page.keyboard.press('Escape');
    await wait(page, 1500);
  }

  const checklistBtn = page.getByRole('button', { name: /checklist/i });
  if (await checklistBtn.count()) {
    await checklistBtn.first().click();
    await caption(page, 'Modèles de checklist (ouverture, fermeture…) — génération en 1 clic');
    await wait(page, 3200);
    await page.keyboard.press('Escape');
    await wait(page, 1200);
  }

  const teamBtn = page.getByRole('button', { name: /équipe|Mon équipe/i });
  if (await teamBtn.count()) {
    await teamBtn.first().click();
    await caption(page, 'Inviter l’équipe avec un code à 8 caractères (connexion sans mot de passe)');
    await wait(page, 3500);
    await page.keyboard.press('Escape');
    await wait(page, 1200);
  }

  await safeClick(page, page.getByRole('button', { name: /Actualiser/i }));
  await caption(page, 'Actualiser pour synchroniser — même liste pour toute l’équipe');
  await wait(page, 3500);

  await caption(page, 'DailyDo · www.dailydo-saas.app — Merci !');
  await wait(page, 3000);
} catch (err) {
  console.error('Erreur pendant l’enregistrement:', err);
  await caption(page, `Erreur démo : ${err.message?.slice(0, 80) || 'timeout'}`);
  await wait(page, 2000);
}

const video = page.video();
await context.close();
await browser.close();

if (video) {
  const raw = await video.path();
  if (existsSync(OUTPUT)) {
    const { unlinkSync } = await import('fs');
    unlinkSync(OUTPUT);
  }
  renameSync(raw, OUTPUT);
  console.log(`Vidéo enregistrée : ${OUTPUT}`);
} else {
  console.error('Aucune vidéo générée.');
  process.exit(1);
}
