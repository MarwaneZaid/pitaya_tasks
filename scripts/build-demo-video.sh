#!/usr/bin/env bash
# Démo manager DailyDo : captures annotées + MP4.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEMO="$ROOT/docs/demo"
FRAMES="$DEMO/frames"
ANNOTATED="$FRAMES/annotated"
OUT="$DEMO/dailydo-demo-managers.mp4"
SRT="$DEMO/dailydo-demo-managers.srt"
TMP_SCREENSHOTS="/var/folders/x7/vy5ms5l527l139py4ylw76mw0000gn/T/cursor/screenshots/Users/skat/Documents/App_tasks/docs/demo"

mkdir -p "$FRAMES"

copy_frame() {
  local name="$1"
  local src="$TMP_SCREENSHOTS/$name"
  local dst="$FRAMES/$name"
  if [[ -f "$src" ]]; then
    cp "$src" "$dst"
  elif [[ -f "$DEMO/$name" ]]; then
    cp "$DEMO/$name" "$dst"
  fi
}

for f in 01-dashboard.png 02-tache-en-cours.png 03-planning.png 04-planning-lundi.png 05-equipe.png 06-checklists.png; do
  copy_frame "$f"
done

PYTHON="$ROOT/scripts/.venv-demo/bin/python"
if [[ ! -x "$PYTHON" ]]; then
  python3 -m venv "$ROOT/scripts/.venv-demo"
  "$ROOT/scripts/.venv-demo/bin/pip" install pillow -q
fi
"$PYTHON" "$ROOT/scripts/annotate-demo-frames.py"

make_slide() {
  local img="$1"
  local out="$2"
  local duration="${3:-6}"
  ffmpeg -y -loop 1 -i "$img" \
    -vf "scale=1280:820:force_original_aspect_ratio=decrease,pad=1280:820:(ow-iw)/2:(oh-ih)/2:0xf1f5f9" \
    -t "$duration" -pix_fmt yuv420p "$out" -loglevel error
}

LIST="$FRAMES/concat.txt"
rm -f "$LIST" "$OUT"
: > "$LIST"

declare -a SLIDES=(
  "00-intro.png|7"
  "01-dashboard.png|7"
  "02-tache-en-cours.png|7"
  "04-planning-lundi.png|8"
  "05-equipe.png|7"
  "06-checklists.png|8"
  "07-actualiser.png|7"
  "99-outro.png|5"
)

i=1
for entry in "${SLIDES[@]}"; do
  img="${entry%%|*}"
  dur="${entry#*|}"
  src="$ANNOTATED/$img"
  if [[ -f "$src" ]]; then
    seg="$FRAMES/seg-$(printf '%02d' "$i").mp4"
    make_slide "$src" "$seg" "$dur"
    echo "file '$seg'" >> "$LIST"
    i=$((i + 1))
  fi
done

ffmpeg -y -f concat -safe 0 -i "$LIST" -c:v libx264 -pix_fmt yuv420p -movflags +faststart "$OUT" -loglevel error

cat > "$SRT" <<'EOF'
1
00:00:00,000 --> 00:00:07,000
DailyDo — Guide manager. Tableau partagé pour équipes restaurant.

2
00:00:07,000 --> 00:00:14,000
Connexion Gérant : nom du restaurant + mot de passe. Tâches du jour automatiques. Sync temps réel.

3
00:00:14,000 --> 00:00:21,000
Cliquez sur l'icône : À faire → En cours → Terminée. Note/preuve optionnelle en cours.

4
00:00:21,000 --> 00:00:29,000
Planning : icône crayon → configurer Lundi à Dimanche. Enregistrer pour génération automatique.

5
00:00:29,000 --> 00:00:36,000
Équipe : copier le code à 8 caractères. Employés : onglet Équipe, sans mot de passe.

6
00:00:36,000 --> 00:00:44,000
Checklists : modèles Ouverture/Fermeture puis bouton Générer les checklists.

7
00:00:44,000 --> 00:00:51,000
Suivi : barre de progression, filtres par poste, bouton Actualiser.

8
00:00:51,000 --> 00:00:56,000
DailyDo · www.dailydo-saas.app
EOF

echo "Vidéo créée : $OUT"
echo "Sous-titres : $SRT"
ls -lh "$OUT"
