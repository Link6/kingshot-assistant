#!/usr/bin/env bash
set -euo pipefail
shopt -s nullglob

version=$(node -p "require('./package.json').version")
[[ "$RELEASE_TAG" == "v$version" ]] || { echo 'Release version mismatch'; exit 1; }
notes="release-notes/$RELEASE_TAG.md"
[[ -f "$notes" ]] || { echo "Missing release notes: $notes"; exit 1; }

windows=(release-assets/*.exe)
mac=(release-assets/*.dmg)
linux=(release-assets/*.AppImage)
[[ ${#windows[@]} -eq 2 && ${#mac[@]} -eq 1 && ${#linux[@]} -eq 1 ]] || {
  echo 'Expected Windows installer and portable EXEs, one DMG, and one AppImage'
  exit 1
}
files=("${windows[@]}" "${mac[@]}" "${linux[@]}")
for file in "${files[@]}"; do
  [[ -s "$file" && "$file" == *"$version"* ]] || { echo "Invalid release asset: $file"; exit 1; }
done
(
  cd release-assets
  sha256sum -- *.exe *.dmg *.AppImage > SHA256SUMS.txt
)
files+=(release-assets/SHA256SUMS.txt)

# Keep partial uploads in a draft so a failed job can be retried safely.
if draft=$(gh release view "$RELEASE_TAG" --json isDraft --jq '.isDraft' 2>/dev/null); then
  [[ "$draft" == 'true' ]] || { echo 'Release is already public; refusing to replace its assets'; exit 1; }
else
  gh release create "$RELEASE_TAG" --verify-tag --draft \
    --title "Kingshot Assistant $RELEASE_TAG" --notes-file "$notes"
fi
gh release upload "$RELEASE_TAG" "${files[@]}" --clobber
gh release edit "$RELEASE_TAG" --draft=false --latest --notes-file "$notes"
