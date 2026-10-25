# Prompt: Build an Agent-Driven Voxel Asset Generation Toolkit

You are a senior tools engineer and technical artist. Work directly from the supplied `advance-wars-main` ZIP. First extract and inspect the real repository; then build a clean, standalone toolkit that lets a coding agent generate new voxel game assets from the user's natural-language request by using the project's existing voxel-modeling and sprite-baking pipeline.

**The primary workflow is agent-driven asset production, not a generic voxel editor.** I will tell the coding agent what assets I want (for example, “make a snow tile, cracked dry ground, and marsh terrain that match the current game”). The agent must interpret that brief, model the assets in source code using the existing tools, run the pipeline, inspect the rendered results, revise them as needed, and deliver the generated sprites. Do not replace that workflow with an app where I have to manually sculpt every voxel.

Do not stop after writing a plan. Implement the toolkit, verify it, and package the result into one ZIP.

## 1. Audit the Supplied Project First

Inspect the archive and use its actual current files. Do not rely only on old docs or assumed file paths. In particular, inspect:

- `tools/voxel_pipeline/build.mjs`
- `tools/voxel_pipeline/bake.mjs`
- `tools/voxel_pipeline/preview.mjs`
- `tools/voxel_pipeline/models/units.mjs`
- `tools/voxel_pipeline/models/buildings.mjs`
- `tools/voxel_pipeline/models/terrain.mjs`
- `data/voxels.json`
- `data/units.json`
- `data/animation.json`
- `src/armies.js`
- `game_assets/voxels/` and `game_assets/voxels/sheets/manifest.json`
- the relevant voxel docs in `docs/`
- `package.json`, existing voxel tests, and any validators these scripts use.

The supplied project is a Node.js ES-module project targeting Node 22. Its voxel authoring grid is `64×64×64`; model geometry is defined in JavaScript, then rendered as preview PNGs and baked facing/variant/animation strips. The existing canvas helpers include primitives such as voxels, boxes, shells, cylinders and ramps, plus group and pivot support for moving parts.

The existing pipeline commands are:

- `npm run voxels:build` — rebuild canonical voxel model data in `data/voxels.json`.
- `npm run voxels:preview` — render individual model previews into `game_assets/voxels/`.
- `npm run voxels:bake` — generate the baked sprite strips and manifest in `game_assets/voxels/sheets/`.
- `npm run voxels:all` — run the build, preview and bake stages in order.
- `node tools/validate-animation.mjs` — use when animation data or model clips change.

Confirm the commands against the supplied source before relying on them. Preserve the current four facings (`right`, `up`, `left`, `down`), the existing team/neutral variant conventions, animation clip metadata, frame anchors, palette behaviour, and format compatibility. The current sheet manifest is `field-command-voxel-sheet-3`; do not accidentally downgrade or silently break it.

Some repository docs may describe an older inventory. Recompute the actual model IDs, PNG counts, sheet paths, frame information, and file sizes from the files themselves. Do not hardcode stale counts into the new system.

## 2. The Intended Workflow

Build the toolkit around this repeatable workflow:

1. **Receive a natural-language asset brief.** The user describes the asset(s), their appearance, category, and any gameplay or visual constraints. The brief may contain several assets in one request.
2. **Plan the assets.** The agent extracts stable IDs, asset categories, distinguishing features, required facings, animation needs, and variant rules. If details are missing, make reasonable assumptions consistent with the project and document them rather than blocking on unnecessary questions.
3. **Inspect existing art.** Search the current preview PNGs, sheet manifest, model scripts, palette and neighboring assets for suitable references. Reuse the project's proportions, lighting, shading, outline/readability, palette and isometric presentation. Do not duplicate an existing model under a new name unless explicitly requested.
4. **Author source geometry.** Implement the model in the appropriate source module or a new well-organized model module using the existing sculpting conventions and primitives. Code/model definitions are the source of truth; do not draw replacement PNGs by hand or paste placeholder pictures over missing work.
5. **Register the model.** Update every required registry/list/configuration point so it is actually built and baked. Keep this process simple and documented. Avoid hidden one-off steps that only the original author knows.
6. **Build and bake.** Run the real pipeline to produce canonical voxel data, previews, directional strips, animation frames when applicable, variants when applicable, and the updated manifest.
7. **Review the images.** Open the generated results in the included HTML reviewer. Inspect every requested asset, all required facings and variants, and the animation frames if present. Check silhouette, orientation, proportions, palette, transparency, clipping, grounding, readability at actual tile scale, and consistency with nearby assets. Do not rely on a successful build alone as evidence that the sprite looks good.
8. **Iterate.** Correct source geometry and rebuild when results are unclear, malformed, misoriented, clipped, duplicated, too noisy, too small, or stylistically inconsistent. Do not finish while known visual defects remain.
9. **Validate and report.** Run structural and image-output checks, ensure prior assets remain unchanged unless the request asked to redesign them, update the inventory/catalog/docs, and report the generated IDs and exact output paths.

Create `docs/AGENT_ASSET_WORKFLOW.md` describing these steps for future coding agents. It should be specific to this repository rather than generic voxel-art advice.

## 3. Make Asset Registration Easy to Extend

The current pipeline has hard-coded rosters and model dispatch logic. Improve its organization enough that future agent requests can add assets reliably without forgetting a required file or list.

- Keep the existing model scripts working and preserve their current outputs.
- Where practical, introduce a clear model registry or a clearly documented, small set of registration points for units, buildings, terrain, and effects.
- Preserve the current model kinds and special handling for units, army-specific unit models, buildings, terrain and effects.
- New terrain IDs must be included in the terrain roster and have source geometry in the appropriate terrain model implementation.
- New buildings must have a valid building implementation and correct idle-frame/clip metadata.
- New units must be integrated consistently with the unit definitions, model roster, animation/family configuration where relevant, and army-variant conventions. Do not add a render-only unit that the pipeline cannot rebuild.
- Static terrain should stay static unless animation is actually useful and authored. Do not invent decorative animation clips just to fill metadata.
- If a model uses moving parts or animations, define genuine geometric changes and valid pivots/groups. The existing baker checks that additional frames visibly change; do not bypass those gates or create fake frames by recolouring identical geometry.
- Ensure each added model is rebuilt from source on a clean extraction of the package. Do not depend on ignored files or assets that exist only in the original game repo.
- Use stable lowercase kebab-case IDs consistent with existing naming conventions. Avoid changing existing IDs unless specifically requested.

The package must explain how an agent adds each supported asset kind, including which registration/data files need updating and which commands to run. If you add a registry abstraction, test that all existing models are still registered and produced.

## 4. Visual and Compatibility Requirements

The generated assets must look like members of the supplied game's existing voxel set, not generic standalone voxel art.

- Use the current 64-cube geometry convention and native palette/shading/rendering pipeline.
- Preserve the existing isometric proportions, lighting and facing rotations. A left-facing image must not be produced by blindly mirroring right-facing geometry where the project expects real rotation.
- Keep the object readable at the runtime tile size. Avoid unnecessary micro-detail that disappears after downsampling.
- Keep voxels inside the supported grid and avoid accidental floating pixels, disconnected fragments, bad seams or excessive hidden interior volume.
- Ensure terrain assets read correctly alongside adjacent tiles. If a brief is for a tile set or connecting pieces, consider edge continuity, transitions and all relevant variations instead of generating isolated attractive thumbnails only.
- Use team variants only for assets that are supposed to be owned/team-coloured. Neutral terrain/effects must follow existing neutral conventions.
- Preserve transparency, alpha handling, crop/bounds, cell size, anchors, frame order, SHA metadata and manifest structure.
- Do not alter gameplay rules, movement costs, map logic, renderers or unrelated UI as part of a visual asset task unless explicitly asked.
- Never replace an existing sprite with a blank, placeholder or lower-quality image to make a pipeline pass.

Be aware that the source documentation notes some flat ground surfaces (such as plains, sea, river and shoal) are vector-rendered rather than authored as voxel models. When a brief concerns such a surface, inspect the current implementation and document the right path instead of forcing every visual into the voxel pipeline. Do not modify those runtime-rendered surfaces as an incidental side effect of building this toolkit.

## 5. Baseline and Regression Safety

Before refactoring anything, record a baseline of the existing voxel outputs. At minimum, capture the path and SHA-256 hash of existing preview PNGs and baked sprite PNGs, along with the current manifest/model inventory.

After the new system is in place:

- Verify the existing source models still build.
- Verify the existing previews and baked images stay byte-identical where no model was intentionally changed. If the pipeline must rewrite a file, explain why and compare decoded pixels where byte identity is not expected.
- When generating new assets, diffs should be limited to the new assets, their required manifest/catalog changes and genuinely necessary shared-source changes.
- Do not delete assets merely because they look repetitive; variants and facings are part of the asset set.
- Include a regression report that identifies any old asset that changed and why. Do not claim all assets were preserved without checking.

## 6. Offline HTML Sprite Reviewer

Create a standalone page named `voxel-sprite-review.html` in the package root. It is for visual review of the actual included asset files, not a mockup and not a page that requires running the game.

It must work offline after extracting the ZIP and opening the HTML file directly. Do not use remote APIs, CDNs, network fetches, or external-hosted libraries. Avoid relying on `fetch()` of local JSON where browsers block it under `file://`; generate/embed the required index or manifest data into the HTML and load the real image files from relative paths. Test this behaviour in a browser when available.

Include:

- A searchable gallery of existing and newly generated model preview PNGs.
- Filters for model category and controls for applicable team/army variant, facing and animation clip/frame.
- A way to inspect the actual baked strip and individual frames, with play/pause or frame stepping for clips with multiple frames.
- Adjustable zoom with pixel-friendly scaling, plus a checkerboard or selectable background for transparent pixels.
- Asset ID, category, dimensions, facing, variant, clip/frame count, anchor metadata and source/output file paths where available.
- Side-by-side or quick-switch comparison between facings and variants.
- Obvious handling of missing/corrupt images and unknown manifest entries; no silent placeholder substitution.
- A quick way to isolate assets generated in the latest run, without hiding the existing assets.

The baked strip PNGs contain packed frames described by the manifest; do not pretend each frame is a separate image file. Use the manifest's frame rectangles and deduplication metadata when showing frames. Verify that selecting a frame actually displays the correct crop from the real strip.

Keep this page focused on review. The agent is responsible for source-code modeling; the HTML page does not need a complex manual voxel-sculpting editor.

## 7. Package the Standalone Toolkit

Create one ZIP, for example `VoxelAssetGenerationToolkit.zip`, with a clean root folder such as `VoxelAssetGenerationToolkit/`.

Include:

- All required source scripts in `tools/voxel_pipeline/`, including build, preview, bake, model modules, and any new registry/validation scripts.
- Required data files to rebuild the voxel models, including `data/voxels.json`, `data/units.json`, and `data/animation.json` when used by the included tools/validators.
- The required small source dependency `src/armies.js` and any other source files that the pipeline actually imports.
- The existing individual model previews in `game_assets/voxels/`.
- The entire existing `game_assets/voxels/sheets/` content, including every applicable facing/variant/animation strip and `manifest.json`.
- The new HTML reviewer.
- A minimal `package.json` with correct scripts and Node version requirements. Do not copy the full game's dependency list if the voxel tools do not need it.
- Documentation and focused Node-based tests/validators needed to maintain and verify the asset pipeline.
- Any model palette/catalog/reference data necessary to reproduce the current outputs.

Create at least these docs:

- `README.md` — what the toolkit is, install/run requirements, exact build commands, output locations, and how to open the HTML reviewer.
- `docs/AGENT_ASSET_WORKFLOW.md` — the natural-language brief → source model → build → preview → bake → visual review → validation workflow.
- `docs/ASSET_REQUEST_TEMPLATE.md` — a short reusable template for asking an agent to generate assets; include fields for asset IDs/names, category, appearance, constraints, variants/facings, and animation needs. Missing fields should be optional.
- `docs/MODEL_FORMAT_AND_REGISTRATION.md` — coordinate/grid rules, palette and model data, supported model kinds, registration points, and animation conventions.
- `docs/PACKAGE_VALIDATION.md` — commands actually run, results, regression/hashes summary, skipped tests and limitations.

Keep the package narrowly scoped to voxel asset production. Exclude unrelated gameplay/frontend/backend code, online-service configuration, audio, ROM-extraction output, `node_modules/`, `.git/`, caches and temporary files. Do not include `build/` or `cmake/` folders. Do not exclude required voxel tools, required model data, documentation, previews or sprite-sheet PNGs just to shrink the ZIP.

The toolkit must be usable as a standalone source project after extraction; document the exact Node version and any real dependencies. If the pipeline needs no external npm packages, keep it that way.

## 8. Validation Before Delivery

Run and record checks appropriate to the packaged toolkit:

1. Build canonical voxel data from the included source files.
2. Generate model previews and baked strips using the real pipeline.
3. Validate model IDs, categories, voxel bounds, palette indices, duplicate coordinates, nonempty output and valid dimensions.
4. Validate manifest references, frame rectangles, clip/frame counts, variant lists, anchors, and all referenced image paths.
5. Verify PNGs are readable and not entirely transparent.
6. Recheck animation data if any clips or frame definitions changed.
7. Verify the HTML reviewer can display preview images, choose variants/facings, inspect actual strip frames, zoom, search and filter assets offline.
8. Extract the final ZIP to a clean temporary folder and rerun the documented build/validation workflow there.
9. Compare the original and final output hashes and explain any unexpected changes.
10. Inspect the ZIP contents to confirm it includes the real current sprites and full sprite-sheet folder, not only a manifest or a small sample.

Use the tests that can run in this isolated package. If an existing full-repository test needs unrelated application dependencies, do not silently omit or misrepresent it; document the limitation and provide focused package-level checks instead. Never claim a command passed unless you actually ran it successfully.

## 9. Example of the Future User Workflow

A future request may look like this:

> Generate these terrain assets: sand, cracked dry ground and snow. Match the existing terrain style and scale. Make them visually distinct at tile size, use appropriate color variation, keep the borders and transitions compatible with the surrounding terrain, and include the necessary voxel models and baked sprite outputs. Review them in the sprite HTML before finishing.

The coding agent should then inspect the existing terrain models, choose appropriate IDs and palette colours, implement or extend the source geometry, register the assets, run the real pipeline, view the rendered previews and baked outputs, adjust the geometry if necessary, run checks, and report the resulting file paths. This example is illustrative only; **do not create these example assets during toolkit setup unless separately instructed**.

## 10. Final Delivery

Deliver the completed ZIP and a direct download link. Also provide a brief summary of the toolkit's contents, the exact commands to generate assets, and the tests actually run. Do not return only a plan, generic advice, code snippets, placeholder images, or an incomplete scaffold.
