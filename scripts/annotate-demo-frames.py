#!/usr/bin/env python3
"""Ajoute titres et texte explicatif sur les captures de la démo manager."""
from __future__ import annotations

import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("Installation de Pillow…", file=sys.stderr)
    import subprocess

    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "-q"])
    from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
FRAMES = ROOT / "docs" / "demo" / "frames"
OUT = FRAMES / "annotated"
W, H = 1280, 820  # +100px bandeau bas

SLIDES = [
    {
        "src": "00-intro.png",
        "out": "00-intro.png",
        "title": "DailyDo — Guide manager",
        "body": "Tableau de bord partagé pour équipes restaurant\nwww.dailydo-saas.app",
        "solid": "#0f172a",
        "title_color": "#ffffff",
        "body_color": "#f59e0b",
    },
    {
        "src": "01-dashboard.png",
        "out": "01-dashboard.png",
        "title": "1. Tableau de bord",
        "body": (
            "Connexion : onglet Gérant → nom du restaurant + mot de passe.\n"
            "Les tâches du jour apparaissent automatiquement. Badge Sync active = "
            "mise à jour temps réel pour toute l'équipe."
        ),
    },
    {
        "src": "02-tache-en-cours.png",
        "out": "02-tache-en-cours.png",
        "title": "2. Faire avancer une tâche",
        "body": (
            "Cliquez sur l'icône à gauche : À faire → En cours → Terminée.\n"
            "En « En cours », ajoutez une note ou preuve (ex. températures OK)."
        ),
    },
    {
        "src": "04-planning-lundi.png",
        "out": "04-planning-lundi.png",
        "title": "3. Planning nettoyage",
        "body": (
            "Gérant : icône crayon orange → onglet Lundi, Mardi, etc.\n"
            "Saisissez les tâches indispensables du jour. Enregistrez : "
            "elles se recréent chaque matin sans clic manuel."
        ),
    },
    {
        "src": "05-equipe.png",
        "out": "05-equipe.png",
        "title": "4. Inviter l'équipe",
        "body": (
            "Icône Équipe → copiez le code à 8 caractères.\n"
            "Les employés : onglet Équipe, entrent le code — pas de mot de passe."
        ),
    },
    {
        "src": "06-checklists.png",
        "out": "06-checklists.png",
        "title": "5. Checklists ouverture / fermeture",
        "body": (
            "Icône presse-papiers → modèles Ouverture, Fermeture, étapes + priorités.\n"
            "Puis « Générer les checklists » sur le tableau de bord."
        ),
    },
    {
        "src": "01-dashboard.png",
        "out": "07-actualiser.png",
        "title": "6. Suivi et filtres",
        "body": (
            "Barre « Exécution du jour » = progression en %.\n"
            "Filtrez par type ou poste (cuisine, salle…). Bouton ↻ pour actualiser."
        ),
    },
    {
        "src": "99-outro.png",
        "out": "99-outro.png",
        "title": "Prêt pour le service !",
        "body": "DailyDo · Pitaya Béthune · www.dailydo-saas.app",
        "solid": "#f59e0b",
        "title_color": "#0f172a",
        "body_color": "#1e293b",
    },
]


def load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        p = Path(path)
        if p.exists():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, font, max_width: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.split("\n"):
        words = paragraph.split()
        if not words:
            lines.append("")
            continue
        current = words[0]
        for word in words[1:]:
            test = f"{current} {word}"
            if draw.textlength(test, font=font) <= max_width:
                current = test
            else:
                lines.append(current)
                current = word
        lines.append(current)
    return lines


def render_slide(spec: dict) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    out_name = spec.get("out", spec["src"])
    out_path = OUT / out_name

    if spec.get("solid"):
        img = Image.new("RGB", (W, H), spec["solid"])
    else:
        src = FRAMES / spec["src"]
        if not src.exists():
            print(f"Capture absente, ignorée : {src}", file=sys.stderr)
            return
        shot = Image.open(src).convert("RGB")
        shot.thumbnail((W, H - 120), Image.Resampling.LANCZOS)
        img = Image.new("RGB", (W, H), "#f1f5f9")
        ox = (W - shot.width) // 2
        oy = 0
        img.paste(shot, (ox, oy))

    draw = ImageDraw.Draw(img)
    title_font = load_font(30, bold=True)
    body_font = load_font(22)

    # Bandeau bas
    banner_h = 120
    draw.rectangle([(0, H - banner_h), (W, H)], fill="#0f172a")
    draw.rectangle([(0, H - banner_h), (W, H - banner_h + 4)], fill="#f59e0b")

    title = spec["title"]
    title_color = spec.get("title_color", "#f59e0b")
    body_color = spec.get("body_color", "#e2e8f0")

    if spec.get("solid"):
        # Plein écran centré (intro / outro)
        t_w = draw.textlength(title, font=title_font)
        draw.text(((W - t_w) / 2, H / 2 - 70), title, fill=title_color, font=title_font)
        for i, line in enumerate(wrap_text(draw, spec["body"], body_font, W - 120)):
            l_w = draw.textlength(line, font=body_font)
            draw.text(((W - l_w) / 2, H / 2 - 20 + i * 30), line, fill=body_color, font=body_font)
    else:
        draw.text((24, H - banner_h + 14), title, fill=title_color, font=title_font)
        y = H - banner_h + 52
        for line in wrap_text(draw, spec["body"], body_font, W - 48):
            draw.text((24, y), line, fill=body_color, font=body_font)
            y += 28

    img.save(out_path, "PNG", optimize=True)
    print(f"→ {out_path.relative_to(ROOT)}")


def main() -> None:
    # Intro / outro vierges si absentes
    for name, color in [("00-intro.png", "#0f172a"), ("99-outro.png", "#f59e0b")]:
        p = FRAMES / name
        if not p.exists():
            Image.new("RGB", (W, H), color).save(p)

    for spec in SLIDES:
        render_slide(spec)


if __name__ == "__main__":
    main()
