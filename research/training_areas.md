# Faction training areas

The website uses actual selected WMO geometry from the owner's local WoW Forever client, rather than the previous
Goldshire terrain tile. The simulator places its own interactive dummies in those environments.

Source client inspected: `wow_classic_beta`, version `1.60.1.70532`, with wow.export 0.2.19. Exports are in yards and
retain wow.export's generator marker. Only selected groups are exported; the complete cities are not published.

| Faction | WMO | FileDataID | Selected groups in this source |
| --- | --- | --- | --- |
| Alliance | `world/wmo/azeroth/buildings/stormwind/stormwind.wmo` | 107243 | 47 `garrisonyard`, 48 `garrison_entry`, 49 `garrison_left`, 50 `garrison_right`, 51 `garrison_hall` |
| Horde | `world/wmo/kalimdor/ogrimmar/orgrimmar2.wmo` | 323174 | 29 `ArenaExt`, with 105 `warriorcanyon2` and 106 `warriorcanyon3` for the surrounding Valley of Honor scenery |

Use the actual group headers/names; this version's root MOGI name indexes do not match the loaded group headers.
Export those groups as GLB with textures and alpha. `tools/prepare_training_area.mjs <export.glb> alliance|horde`
removes duplicate/unused resources and encodes textures with **lossless** WebP, keeping resolution, geometry and visible
pixels. It writes a content-addressed GLB and the `yard:alliance` or `yard:horde` manifest entry. `yard` remains the
Alliance compatibility fallback. The Stormwind anchor places the targets in front of the Command Center entrance,
on a floor with room behind them for the hunter's 12-yard start.

The character's selected race determines its faction, including the class's exported default when no race was saved.
`yard:alliance` and `yard:horde` are separate IndexedDB records, preserving anchors and rotations independently.
Personal imports are retained. A loading overlay covers the first load and race/area changes; combat time does not
advance during a race/area transition.

Validation: both training areas have a floor at all three target positions and the hunter's starting position;
all 16 available race/sex combinations map to an exported area. Browser QA checks both city scenes and confirms no
`models/human.glb` request when a published WoW character loads successfully.

Game assets are Blizzard Entertainment's and are not covered by this repository's MIT code license.
