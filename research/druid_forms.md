# Published druid forms

Exported from the owner's installed Forever client **1.60.1.70634**, product `wowf`, on 2026-11-02.
The client is read only. The local wow.export 0.2.19 exporter supplies the original geometry, skinning,
animations and textures; lossless WebP reduces image transfer size. No texture resizing or geometry simplification.

| Race | Form | CreatureDisplayInfo | M2 FileDataID | Texture FileDataID | Display scale |
| --- | --- | --- | --- | --- | --- |
| Tauren | Cat | 8571 | 123688 | 123689 | 1 |
| Tauren | Bear | 2289 | 123680 | 305430 | 1.2 |
| Skyborne, both factions | Cat, Blue | 144330 | 7749920 | 7754295 | 0.9 |
| Skyborne, both factions | Bear, Blue | 144331 | 7749917 | 8180959 | 1 |

Sources: `CreatureModelData`, `CreatureDisplayInfo`, `ChrCustomizationDisplayInfo`,
`ChrCustomizationElement` and `ChrCustomizationChoice` in that client. The Blue choices are 63116 (cat)
and 63112 (bear). High Order and Windshaper share the same character model IDs and form appearances.
The site uses this Blue pair for both factions, with separate manifest aliases, so no guessed recoloring is needed.
Tauren keeps the original brown cat and brown bear appearances. Night Elf retains its published exports.

Model filenames:

- `creature/druidcattauren/druidcattauren.m2`
- `creature/druidbear/druidbeartauren.m2`
- `creature/druidcatskyborne_c60/druidcatskyborne_c60.m2`
- `creature/druidbearskyborne_c60/druidbearskyborne_c60.m2`

Raw local exports and `sources.json` stay in `~/wow.export/druid-forms/`. Each raw file is
`<race>-<cat|bear>-source.glb`. To prepare them again:

```sh
node tools/prepare_druid_forms.mjs <folder-containing-sources.json-and-source-GLBs>
npm run export:wow -- --forms-only
npm run test:models
npm run build
```

The preparation tool sets original display scales on a common parent of the rig and meshes, writes
content-addressed GLBs to the owner's export folder, and updates its `yard-models.json`. Publishing with
`--forms-only` adds the six race keys and shared resources to the existing manifest, without rebuilding cities
or character equipment. Both Skyborne factions point to the same files. Cat exports have 72 (Tauren) and
99 (Skyborne) animations; bear exports have 68 and 76 respectively.

`npm run test:models` checks all six choices, their original textures, display scales, idle/run/attack/ability
clips and animated skeletons. Browser QA also checks the rendered forms and switching races in Cat and Bear.
Future client changes require a new export; these are the forms present in the installed build above.
Game assets remain Blizzard's, outside the repository's MIT code license.
