# 电影场景美术

素材使用内置 imagegen 生成，随后仅转为 WebP 编码供网页加载。背景、狮子与舞蹈帧图是美术层；贺卡、双犬和蛋糕是实时 Three.js 场景。未使用电影原片或电影原声。

角色逐帧动作由代码驱动，开卡、琴音、吼声和许愿事件共同驱动环境光、粒子和双犬反应。所有素材随项目本地提供。

## images/jazz-night.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: finished cinematic website background, landscape 1536 x 1024. Create a gorgeous original romantic Los Angeles hilltop jazz scene inspired by the lighting and cinematography of La La Land: blue-hour periwinkle sky fading into dusky rose at the horizon, luminous sprawling city lights and dark layered hills, a softly illuminated Griffith Observatory dome far away, a single elegant vintage streetlamp at the left edge, a polished ebony grand piano with its lid open on the right third, a small empty piano bench. Foreground stone terrace and very subtle jacaranda petals. The central terrace is empty, reserved for animated characters that will be composited there; NO people. Sophisticated cinematic painterly realism with physically convincing materials, beautiful soft glow, deep indigo shadows, muted amber highlights; refined film production design and slightly tactile grain. Eye-level wide shot, sweeping landscape, careful negative space in the center, piano fully visible lower right. No text, no logo, no watermark, no poster border, no interface. This must look like expensive film concept art, NOT flat clip art, NOT cartoon vector art.
```

## images/castle-night.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: cinematic full-screen website environment, very wide landscape 1536 x 1024. Create a magnificent magical castle library at night, original environment evoking the warm mystery of Hogwarts. Camera close to a dark polished walnut writing desk in the foreground, whose right half is EMPTY and reserved for an interactive 3D birthday invitation composited later. Tall Gothic leaded windows on the RIGHT show a distant warmly lit medieval castle on a rocky lakeside under a midnight blue sky and a crescent moon. A few lit taper candles and stacked old books at the far edges, hanging tiny warm lights high above, flowing burgundy velvet curtain on the far LEFT. Compose the LEFT third mostly dark quiet space reserved for large Chinese typography. Deep real spatial depth, rich walnut and aged brass, warm candle light against blue moonlight, a light haze and a handful of suspended dust motes. Expensive film cinematography, photoreal materials with painterly restraint, anamorphic feeling, soft luminous highlights but restrained saturation. The desk extends to the bottom edge, pleasing generous negative space at center-right. No people, no animals, no card, no cakes, no text, no logos, no floating UI. Beautiful believable cinematic lighting rather than fantasy clipart.
```

## images/savanna-cinema.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: landscape 1536 x 1024 cinematic website environment. An awe-inspiring African savanna at the last golden light before sunset, original film concept art evoking the majesty and tenderness of The Lion King. Wide elevated view over layered rolling plains, winding silver river and scattered acacia trees, immense apricot sun low near the RIGHT horizon, purple distant mountains, beautiful layers of warm dusty atmosphere. In the LOWER LEFT foreground a broad weathered sandstone rock ledge with a flat upper surface, reserved for an animated lion character, no animal painted on the ledge. At bottom right sparse delicate savanna grasses in shadow. Center foreground is quiet and unobstructed, reserved for a birthday cake overlay. Refined photorealistic cinematic painting, tactile rock surfaces, rich earth colors, muted amber sunlight and plum shadows, delicate volumetric sun rays, no harsh yellow saturation, no graphic silhouettes. Large-scale and immersive, eye-level horizon at 40 percent from top. NO text, no logos, no animals, no people, no cake, no UI.
```

## images/lion-atlas.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: transparent character animation sprite atlas for a cinematic birthday website, 2048 x 1536 px. EXACT layout: FOUR equal columns and THREE equal rows, twelve equal square 512 x 512 cells, no gutters, no lines. Each cell contains the SAME gorgeous male African lion, full body entirely within the cell, identical camera, size and lighting. Lion faces RIGHT in clean three-quarter side profile, body length fills about 85% of cell width, feet on a consistent baseline at 84% cell height. Warm honey gold coat, luxurious soft auburn mane, anatomically believable but appealing and kind expressive face, realistic fur and paws, premium animated feature-film 3D render with restrained stylization. Warm sunset rim light from top right, soft neutral key light so details visible, beautiful amber eyes. Row 1 and row 2 are EIGHT consecutive frames of a graceful running gait in place, changing front and back leg positions naturally, mane and tail moving; keep torso centered with consistent scale. Row 3: cell 1 proud standing resting pose; cell 2 begins to lift head and open mouth; cell 3 head raised and mouth open in a friendly powerful roar; cell 4 closing mouth returning to proud standing. Everything outside the lion MUST be genuine transparent alpha, no checkerboard, no background color, no ground, no shadow plate. No text or labels, no duplicate bodies within a cell, no detached limbs, no props, no watermark. Uniform grid and consistent character identity are essential for CSS sprite animation.
```

## images/dance-atlas.webp

生成提示词：

```text
Use case: stylized-concept. Asset type: character animation sprite atlas for a cinematic website, landscape image in exactly 4 columns and 2 rows, EIGHT equal square cells with no gutters or borders. Transparent alpha background. Each cell is one consecutive pose of the SAME couple doing a joyful graceful swing dance on a hilltop in Los Angeles inspired by La La Land. Woman with shoulder-length auburn hair in a beautifully flowing mustard yellow knee-length dress and low dance heels; man with short dark hair in a white rolled-sleeve shirt, narrow dark tie, dark navy trousers and brown dance shoes. Both adults. Premium film concept art, realistic anatomy and beautiful cloth materials, slightly painterly cinematic rendering, not vector, not silhouettes, not cartoon icons. Soft dusk blue ambient light and warm amber edge light, clear fine facial details but not celebrity likenesses. A complete smooth sequence: hand-in-hand step, leaning away, lifting linked hands, woman half-turn, skirt flowing turn, coming back together, playful kick, returning hand-in-hand. Full bodies including feet, each pair centered inside each cell, ALL poses fit with 12 percent transparent padding around every cell, their feet are at 88 percent height and heads around 14 percent. Both characters equally tall in all frames with consistent proportions. Entire background is truly transparent alpha, no checkerboard, no shadows outside the characters, no text, no labels, no lines, no logo.
```
