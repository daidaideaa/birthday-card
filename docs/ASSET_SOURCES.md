# 资产契约来源登记

`assets/demo/invitation.svg` 是本项目原创部署示意素材，按 CC0-1.0 提供，仅验证管线，不替代 Claude 的美术和章节。

现有影片、模型、图片、音频的真实来源和署名继续见 [public/ASSET_SOURCES.md](../public/ASSET_SOURCES.md)。原有角色和琴键功能保留；旧影片检查仅在新美术替换并验收之后迁移。

Claude 新资源在 `assets/source-manifest.json` 登记逻辑 ID、kind、variants、license、source、dependencies 和 bundles。输入 file 相对于显式 `--source`，发布器计算 bytes 和 sha256；禁止手写哈希。图集页、解码器与外部纹理必须完整登记依赖，GLB 发布检查要求内嵌贴图。
