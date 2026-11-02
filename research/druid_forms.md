# Druid forms: SD selection and previews

Updated from the owner's local Forever client **1.60.1.70634** (`wowf`) on 2026-11-02.
The client is read only. wow.export 0.2.19 exports original geometry, rigs, animations and textures.
Texture compression is lossless WebP, with no resizing or geometry simplification.

Night Elf and Tauren use **SD**. Skyborne keeps **HD** where its own SD does not exist, as requested by the owner.
Blizzard's announcement places Skyborne SD, including druid forms, in early 2027:
https://news.blizzard.com/en-us/article/24302546/world-of-warcraft-forever-the-future-of-skyborne-visual-updates
No Skyborne SD variant was found among the installed client's named models or form choices.

| Race | Form | Definition | Display ID | M2 FileDataID | Texture FileDataIDs | Scale |
| --- | --- | --- | --- | --- | --- | --- |
| Night Elf | Cat | SD | 145380 | 307529 | 307763; fixed eye texture | 0.9 |
| Night Elf | Bear | SD | 147881 | 307528 | 123679 | 1.2 |
| Tauren | Cat | SD | 145381 | 307530 | 307862 | 0.9 |
| Tauren | Bear | SD | 147880 | 307527 | 123681 | 1.2 |
| Night Elf | Moonkin | SD | classic M2 override | 123690 | 123691, 123692; fixed eye texture | 0.9 |
| Tauren | Moonkin | SD | classic M2 override | 123695 | 123693, 123694 | 1.1 |
| Skyborne, both factions | Cat, Blue | HD | 144330 | 7749920 | 7754295 | 0.9 |
| Skyborne, both factions | Bear, Blue | HD | 144331 | 7749917 | 8180959 | 1 |
| Skyborne, both factions | Moonkin | HD | 144900 | 7581777 | 7515071, 1139243 | 0.9 |
| Night Elf and Tauren | Travel, cheetah | SD | 918 | 126171 | 126187 | 0.8 |
| Skyborne, both factions | Travel, Blue | HD | 145284 | 7749922 | 7903265 | 1 |
| All four race choices | Aquatic | SD | 2428 | 125835 | 125836 | 1 |
| All four race choices | Tree, client preview | SD | 864 | 123756 | 123757; fixed stump texture | 1 |

Cat/Bear SD are the actual `_legacy.m2` variants. Their meshes have 673-742 triangles;
classic Moonkin has 980-1032 triangles. Moonkin's current display rows point to newer meshes;
the SD exports explicitly use the original `druidowlbear.m2` and `druidowlbeartauren.m2`, original
race textures, and the corresponding 0.9/1.1 display scales. Dire Bear shares its race's Bear model.

Sources: local `SpellShapeshiftForm`, `CreatureModelData`, `CreatureDisplayInfo`,
`ChrCustomizationDisplayInfo`, `ChrCustomizationElement`, `ChrCustomizationChoice`, and M2 render flags.
There are 13 distinct exports and 28 race/form keys, plus unqualified aliases for Night Elf compatibility.
Shared Aquatic and Tree forms use their client table appearance; they are not custom Skyborne SD variants.

## Site behavior

- Cat and Bear practice use their race's form automatically.
- Balance's visible Moonkin follows the existing `moonkinForm` aura. Pressing the ability enters or leaves it;
  a build without the talent stays humanoid. The existing preset named `moonkin` does not spend the Moonkin
  talent; the preset `balance` does. These presets and combat rules are unchanged.
- The Druid forms selector previews Cat, Bear, Dire Bear, Moonkin, Travel, Aquatic and Tree on any druid spec.
  Preview pauses combat and encounters, blocks action buttons and pulls, cancels pending pull countdowns,
  and lets the user move and orbit the model. Returning to Practice form resumes the same practice state.
- Aquatic is displayed on land with its swim idle/movement clips and a notice that swimming is not simulated.
  Tree is a client model preview, with no healing simulation. No Flight form was added: Forever's local
  shapeshift table does not offer a playable flight form.
- Only the current spec's form is fetched at startup. Other forms load when previewed or opened in Settings.
  Loading or switching race uses the existing progress overlay. Personal browser imports remain supported.
- M2 cutout flags restore transparent fur/feathers/leaves; double-sided flags and additive eyes are retained.

## Reproduction

Raw `<race>-<form>-source.glb` exports and `sources.json` are kept in `~/wow.export/druid-forms/`.
The source manifest records IDs, scales, SD/HD definition and each mesh's original render flags.

```sh
node tools/prepare_druid_forms.mjs <folder-with-sources.json-and-source-GLBs>
npm run export:wow -- --forms-only
npm run test:models
npm test
npm run build
```

Preparation updates the owner's local selection and content-addressed GLBs. `--forms-only` merges all form
keys into the public manifest without rebuilding maps, equipment or other classes; stale form metadata is removed.
Tests cover all 28 mappings, SD/HD choice, low-poly geometry, original textures, leaf transparency, original scales,
13 animated skeletons, ability clips and entering/leaving Moonkin. Browser QA covers the selector and combat pause.
Future client changes require re-exporting. Game assets remain Blizzard's, outside the MIT code license.
