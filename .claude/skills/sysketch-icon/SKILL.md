---
name: sysketch-icon
description: Draw, redraw or fix sysketch diagram icons as hand-written isometric 3D SVGs that pass `npm run icons` on the first try. Use whenever the owner asks for a new icon, a restyle, an icon batch, or a fix for an icon that `npm run icons` rejected or that looks off in `icons-src/_preview.png`. Also use for "draw the <name> icon", "make an icon for X" or "this icon looks wrong" in the sysketch project.
---

# sysketch icon creation

Every sysketch icon is a small hand-written SVG in a 2:1 isometric style, using four placeholder colors that each theme swaps for its own. You write the SVG code directly; never use an image generator or trace a picture.

## Before drawing

Read the style guide in full: `docs/isometric/GUIDE.md` in the sysketch repo (or `references/GUIDE.md` next to this file when the repo isn't available). It holds the grid, the light and color rules, the technical limits, two reference icons and a one-line brief for every icon name. Its section 4 prompt is the contract; follow it as if it were pasted to you.

Then look at one or two existing icons in `icons-src/` that are close to what you're drawing, so the new one matches the set's size, baseline and detail level.

## The rules that break most often

- Edges are vertical, slope +1/2 or slope -1/2 only. Isometric circles are ellipses with `rx = 2 * ry`.
- Standard footprint: diamond 32 x 16 centered on x = 24; everything inside x 4..44, y 3..46; resting on a baseline near y 43..46.
- Colors: `#FF0000` top faces, `#00FF00` left faces, `#FFFF00` right faces, `#0000FF` outlines and tiny dark details, `none`. Nothing else, no `opacity`.
- `viewBox="0 0 48 48"`; only `path rect circle ellipse line polygon polyline g`; attributes on each shape, never `style=` or `class=`.
- Every face: `stroke="#0000FF" stroke-width="2" stroke-linejoin="round"`; open lines also `stroke-linecap="round"`.
- Draw back to front; the top face of each piece comes last.
- 3 to 12 faces, at most a couple of details, each at least 2 px thick. It must read at 32 px. Keep the file under 2,000 characters.
- Real-world proportions: one u or v unit is about 2.24 px on screen, one z unit is 1 px. A portrait page needs roughly 3 z units of height per u unit of width, or it comes out landscape.
- The sketch theme redraws every outline by hand (twice, wobbly), so outlines closer than ~3 px blur into scribble. Avoid narrow bands and doubled rims. Flat-lying rings squash their holes to a few px, so stand rings upright. A thin extruded rim reads best with no outline of its own (`stroke="none"`): its fill gives the depth and the sketch theme stays clean.
- Depth reads best from visible thickness: a lit rim or wall behind each face, or faces on different planes. Two thin shapes side by side look flat however you shade them. A chain of two flat-lying links does not work (squashed holes), so the `link` uses two upright links with an extruded rim.
- Keep silhouettes whole: a cut-out corner without matching edge faces reads as a bite taken out of the shape.

## Generators

For geometry that is tedious by hand (extruded polygons, arcs, rings), `docs/isometric/generators/` has the helpers used for the product icons: `iso.mjs` (projection, `box`, `extrude`, `arc`), `batch3.mjs` (one function per icon) and `center2.py` (measures each icon and centers it on x = 24 with a shared baseline). Write new icons as functions there, generate with origin 0,0, run `center2.py`, regenerate with its offsets, then run `npm run icons`.

## Workflow (in the repo)

1. Write `icons-src/<name>.svg`, named exactly as in `docs/icon-checklist.md`. To keep an old version, rename it `<name>-old.svg` first.
2. Run `npm run icons`. Fix every ✗ and rerun until it is clean; treat warnings as things to fix too.
3. Open `icons-src/_preview.png` (and a zoomed render in the classic, midnight and sketch themes) and check the new icon against the guide's section 6 checklist: same size and baseline as `server`/`database`, top lightest / left mid / right darkest in every theme row, no hairline details, set-consistent look.
4. Show the owner the preview, then commit `icons-src/<name>.svg` and the regenerated `packages/sysketch/src/icons.generated.ts` only when asked.

## Without the repo (claude.ai)

Output, per icon, one line with the filename and one ```svg block holding the whole file, nothing else. Check each icon against every rule above before answering. Do 3 to 5 icons per batch; quality drops in larger batches.
