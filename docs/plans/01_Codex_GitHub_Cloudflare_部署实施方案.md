# 《写给师宝宝的一场梦》——GitHub / Cloudflare 部署实施方案

**交接对象：Codex**  
**版本：V3.0 · 2026-09-25**  
**配套文件：`02_Claude_电影化前端美化与交互改造方案.md`**  
**仓库：<https://github.com/daidaideaa/birthday-card>**

> 你的职责是把项目接到可靠、可回滚的网页发布和媒体分发链路上，不是重新设计人物、美术或四章剧情。最终使用者在 iPhone 上点击一个 HTTPS 网址即可观看和操作，不安装 App，不手动下载素材，不强制添加到主屏幕。电影化前端由 Claude 负责；两边必须遵守本文件的共享资产契约。
>
> 这是实施任务书，不是“已经部署成功”的记录。只有实际执行过、取得结果的步骤才能写成已完成。当前未提供 Cloudflare 账户授权、最终域名和密钥，不能编造这些配置已经存在。

## 0. 开工指令与边界

先检查当前工作区、实际源码和已存在的云端配置，再实施最小充分改动。README 及旧的 `ART_DIRECTION.md` 仅供了解历史；其“核心角色使用影片”“必须保留 GitHub Pages”等约束已被本次方案取代。

**本任务负责：** GitHub Actions、Cloudflare Pages、R2、域名接入、资源 URL 与 manifest、CORS、缓存、发布检查、回滚、本地配置说明，以及与 Claude 的接口交接。

**本任务不负责：** 角色定妆、绘景、编舞、四章布局、2D 狮子动画和各章镜头。不要以迁移部署为由把交互退回影片、删掉琴键功能，或降低美术目标。

执行约束：

- 不把密码、Token、Access Key、签名 URL 或私人照片写入源码、提交记录、前端环境变量或日志。
- 不购买域名、不升级付费套餐、不修改整域 DNS / nameserver、不删除存储桶、不停用现有生产站点，除非得到对相应动作的明确授权。
- 已授权的代码工作连续推进；权限缺失只阻塞相应云端步骤，不阻塞本地实现、测试和文档。
- 遵守实际 `AGENTS.md` 中安全、保留用户改动及验证要求。旧的视觉路线与本轮冲突时记录替代关系，不照搬旧路线。
- 不反复全仓扫描、重复核对同一 SHA、重跑无关测试。先检查一次，按改动范围验证，只有明确失败才扩展检查。
- 默认使用独立分支 / worktree。未经本轮执行授权，不直接合并到 `main`、公开部署或修改账户配置。

## 1. 已确定的产品与部署方向

| 项目 | 本轮确定内容 |
| --- | --- |
| 作品名称 | 写给师宝宝的一场梦；页面称呼为“师宝宝”。 |
| 使用方式 | 手机网页直接打开；Safari 为主要验收浏览器，其他 iPhone 浏览器与应用内浏览器记录实际表现。 |
| 设备信息 | 用户说“今年的 iPhone”；确切型号、系统和浏览器版本仍未知，不能擅自写成某个 Pro 型号或某版 Safari。 |
| 表现形式 | 2D、2.5D、局部精细 3D、HTML/CSS 混合；统一美术与镜头，不强迫全 3D。 |
| 用户最高优先级 | 美观、四章风格一致、操作跟手、过场自然、前端流畅。 |
| 源码 | 继续使用 GitHub 的 `daidaideaa/birthday-card`。 |
| 网站 | Cloudflare Pages 为新部署主线；GitHub Pages 迁移期保留回退，不要求双端永久维护。 |
| 大资源 | Cloudflare R2 Standard；按需请求，不能一次拉取整个素材库。 |
| 网址 | 先可用自选项目名的 `*.pages.dev`；正式可绑定用户拥有的域名。示例域名不是已注册域名。 |
| 当前内容 | 许可清楚的网图和明确标注的示意文案；真实照片、信与录音后续替换。 |
| 费用 | 免费额度优先，不承诺任何访问规模下永久零费用。域名注册、R2 超额和可选动态服务分别核算。 |

### 1.1 主方案：静态网站 + 媒体独立分发

```text
GitHub 仓库
  └─ GitHub Actions：检查、构建、批准后发布
       ├─ Cloudflare Pages：HTML / JS / CSS / 小型本地资源
       │    ├─ https://<project>.pages.dev
       │    └─ https://dream.example.com       [用户提供域名后]
       └─ Cloudflare R2：GLB / KTX2 / 2D 图集 / 绘景 / 音频
            └─ https://assets.example.com/birthday-card/...

iPhone 浏览器：打开网站，由前端按章节请求媒体。
```

`example.com` 全部是占位符。源码不得硬编码它。浏览器请求资源会消耗网络流量并使用内存 / 缓存，但不需要用户保存文件或安装程序。

### 1.2 没有域名时，不让域名购买阻塞开发

有三种有明确边界的模式：

| 模式 | 网页 | 媒体 | 用途 |
| --- | --- | --- | --- |
| 本地 / 小型预览 | Vite 或 `*.pages.dev` | `public/media/` 内的小型样章 | 最早阶段，不需要 R2 密钥。 |
| 自定义资源域名模式，主推荐 | Pages 默认域名或自定义域名 | R2 Custom Domain | 已有或愿意提供域名时，静态媒体分发最直接。 |
| 无自有域名的 R2 模式 | `*.pages.dev` | Pages Function 的 `/media/*` 读取私有 R2 | 可以不购买域名，但媒体请求会经过 Functions，必须计入 Workers 配额。 |

不要用 `r2.dev` 作为正式生产资源入口。官方将它定位为有限流的开发入口；也不要把自定义 CNAME 指向 `r2.dev`。[C04]

**默认不要同时做两套线上网关。** 先检查用户域名情况，有域名走主方案；没有域名先做本地样章和 Pages 预览，需要接 R2 再启用第 3 种模式。前端通过同一个资产接口切换，不改场景代码。

## 2. 费用、容量与“免费”的准确含义

以下为 2026-09-25 查阅的官方规则；执行时只需在开通前复核一次，不将这些数字视为永久不变的 SLA。[C01–C05]

| 产品 | 免费额度 / 主要限制 | 对本项目的意义 |
| --- | --- | --- |
| Pages Free | 每站点至多 20,000 个文件，单文件最大 25 MiB；Git 集成构建额度为每月 500 次。 | 放站点代码和小资源；不要把数千张原始动画帧直接随站点发布。 |
| Pages 静态资源 | 静态请求免费、不按静态请求量收费；Functions 另计。 | 不需要为纯静态站点先购买 Workers Paid。 |
| R2 Standard 免费层 | 每月 10 GB-month 存储、100 万 Class A、1,000 万 Class B 操作。 | 是按使用量计费的免费层，不是 10 GB 的硬限额，也不是“超过后一定自动停用”。 |
| R2 Standard 超额 | 存储 $0.015/GB-month；Class A $4.50/百万次，Class B $0.36/百万次；公网出口流量不收费。 | 免费出口不等于免费无限请求，上传、HEAD、列表和读取都要算操作量。 |
| R2 Infrequent Access | 不适用上述 Standard 免费层。 | 本项目不采用此存储类别。 |
| Functions / Workers Free | 动态请求与其他 Workers 共用每日 100,000 次配额。 | 无域名媒体网关会消耗它；不能把所有 URL 无差别导入 Function。 |
| 自定义域名 | Pages 绑定域名与购买域名是两回事。 | 已有域名可用子域；没有域名可以先用 `pages.dev`，不擅自买域名。 |

R2 开通需要账户完成 subscription / checkout 流程。是否要求填写支付方式，以实际账户界面为准；不能代填支付信息或未经同意开通计费项目。[C03]

**费用保护要求：** 使用专用桶；记录当前占用、保留版本数和操作量；开启可用的用量 / 账单提醒；默认不自动升级。提醒不等于硬性费用上限。不要为每次浏览器打开遍历整个桶，也不要每次 push 全量重传所有资源。

首轮成品媒体以约 60–120 MiB 的完整主线为优化目标，约 150 MiB 作为复核触发线，具体预算由 Claude 的实际美术样章决定。这是工程预算，不是平台限制，不应先把 500 MiB–1 GiB 当作理所当然的手机交付包。

## 3. 开始前的最小检查

```bash
git status --short
git log -1 --oneline
```

随后定向检查：

```text
AGENTS.md
package.json / package-lock.json
vite.config.ts
src/utils/assetUrl.ts
src/content/story.ts
.github/workflows/pages.yml
scripts/validate-assets.mjs
scripts/validate-cinema.mjs
src/cinematic/ 和 Claude 当前实际改动到的资产入口
```

本次读到的已知基线：[R01–R03]

- `vite.config.ts` 的 `base` 硬编码为 `/birthday-card/`，迁往根路径站点需要环境化。
- `assetUrl()` 只接受 `public` 下的相对路径，拒绝外站协议。这是合理的本地资源保护，不能简单解除所有限制后把任意 URL 放行。
- 旧 `.github/workflows/pages.yml` 在 push `main` 后构建并发布 GitHub Pages，且要求旧 GLB 与完整 cinema 媒体校验。
- 旧工作流的“完整影片必须存在”不应在 Claude 完成替换后继续约束新版。但迁移尚未完成时，也不能为让 CI 变绿直接移除所有媒体检查。

本次没有核实用户 Cloudflare 控制台已有项目、存储桶或域名。实施时发现已有配置优先复用，记录差异，不重复创建相似名称项目。

## 4. 与 Claude 的分工和合并顺序

| 工作区 / 文件 | 主负责人 | 协作规则 |
| --- | --- | --- |
| `.github/workflows/`、`deploy/`、云端配置与发布说明 | Codex | Claude 不直接改生产工作流。 |
| `vite.config.ts`、`.env.example`、资产 URL helper、manifest 类型 / schema | Codex 先建立 | 作为共享接口；变更前通知另一方。 |
| `src/content/`、舞台与场景、样式、角色、2D 动画、声音体验 | Claude | Codex 不用部署补丁覆盖美术修改。 |
| `assets/source-manifest.json` 的内容与 `docs/ASSET_SOURCES.md` | Claude | Codex 校验结构、打包和许可字段完整性。 |
| `package.json`、锁文件、`AGENTS.md` | 共享 | 单批次只由一方编辑；先合并另一方再加依赖，禁止整文件覆盖。 |
| 美术母版和运行资产 | Claude 生成 | Codex 接收明确目录或已批准 release，不假定忽略目录会出现在 Actions runner。 |
| 真机画面与连续操作验收 | Claude 主导、用户反馈 | Codex 负责线上路径、缓存、CORS、冷启动网络侧证据。 |

建议分支：`infra/cloudflare-delivery` 与 `experience/cinematic-v3`，名称可按实际规范调整。优先合入“资产契约 + 本地可运行示例”，让 Claude 不依赖真实云账户就能开发。

## 5. 唯一共享资产契约：两个文档必须一致

### 5.1 环境变量

| 名称 | 所在位置 | 含义 |
| --- | --- | --- |
| `VITE_APP_BASE` | 公开构建变量 | Pages 为 `/`；迁移期 GitHub Pages 为 `/birthday-card/`。由 Vite 配置读入。 |
| `VITE_ASSET_BASE_URL` | 公开构建变量 | 为空：站点根基址下的 `media/`；或自定义 HTTPS 资源根，例如 `https://assets.example.com/birthday-card/`。 |
| `VITE_CONTENT_MODE` | 公开构建变量 | `demo` / `personal`；当前使用 `demo`。不负责鉴权。 |
| `ASSET_RELEASE_ID` | 构建 / 发布变量 | 选定、已校验的不可变媒体版本；不得自动使用“最新上传”。 |
| `CLOUDFLARE_ACCOUNT_ID` | Actions Variable 或 Secret | Cloudflare 账户标识，不是登录密码。 |
| `CLOUDFLARE_PAGES_PROJECT` | Actions Variable | 真实 Pages 项目名。 |
| `CLOUDFLARE_API_TOKEN` | Actions Secret | 仅用于 Pages 发布的受限 API Token。 |
| `R2_BUCKET_NAME`、`R2_ENDPOINT` | 本地 / Actions 发布配置 | 专用桶和 S3 API endpoint；不传给浏览器。 |
| `R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY` | 本地环境 / Actions Secret | 仅资产上传步骤使用；禁止 `VITE_` 前缀。 |
| `DEPLOY_ENABLED` | Actions Variable | 初始 `false`；核实环境、授权上线后才开启生产自动部署。 |

Vite 的 `VITE_*` 会进入客户端打包结果，不能用于隐藏任何密钥。[C11]

`.env.example` 至少包含以下公开字段，并用中文注释说明三种部署路径：

```dotenv
VITE_APP_BASE=/
VITE_ASSET_BASE_URL=
VITE_CONTENT_MODE=demo
```

本地上传密钥通过受忽略的独立环境文件或会话环境设置。`.env.example` 不出现真实值；`.env.local`、上传凭证文件及备份必须在 `.gitignore` 中。

### 5.2 资源位置与 URL

```text
本地母版 / 中间文件 [不提交]
  .asset-build/
  model-sources/

Claude 输出运行资源 [不直接当已发布]
  .asset-build/runtime/<release-id>/...

仓库追踪的小型源清单 / 契约
  assets/source-manifest.json
  assets/releases/<release-id>.json
  assets/release.lock.json
  docs/ASSET_SOURCES.md

开发运行时生成
  public/asset-manifest.json
  public/media/releases/<release-id>/...

Pages 成品
  dist/index.html
  dist/assets/...
  dist/asset-manifest.json

R2 key [与前端相对路径对应]
  birthday-card/releases/<release-id>/...
```

生产远程模式中，不把全部媒体复制进 `dist/media/`。本地模式则可以准备全部或一个完整样章。小型 demo 素材是否追踪入 Git 由仓库体积决定，不能只追踪一个没人能重建的空清单。

生产以 `assets/release.lock.json` 选定的 release 为准；`ASSET_RELEASE_ID` 若用于明确的本地 / 预览覆盖，必须在日志中记录。生产中二者不一致要失败，不静默选一份。

`public/asset-manifest.json` 是构建生成文件，使用当前批准的 `assets/releases/<release-id>.json`；不要手工维护两份不同内容。源 manifest 描述制作输入，release manifest 描述实际发布的字节和路径，二者职责不同。

### 5.3 类型约定

```ts
export type AssetKind =
  | "image" | "atlas" | "model" | "texture" | "audio" | "data";
export type AssetVariantName = "standard" | "lite";

export interface AssetVariant {
  /** 相对于媒体根，不以 / 开头，不含协议、..、查询参数或片段。 */
  path: string;
  mime: string;
  bytes: number;
  sha256: string;
  width?: number;
  height?: number;
  /** 仅为估计，不冒充浏览器测得的 GPU 内存。 */
  decodedBytesEstimate?: number;
}

export interface AssetEntry {
  kind: AssetKind;
  variants: {
    standard: AssetVariant;
    lite?: AssetVariant;
  };
  /** 必要依赖使用逻辑 ID；图集页、外挂贴图和声音片段不可遗漏。 */
  dependencies?: string[];
}

export interface AssetManifest {
  schemaVersion: 1;
  releaseId: string;
  contentMode: "demo" | "personal";
  assets: Record<string, AssetEntry>;
  bundles: Record<string, {
    critical: string[];
    deferred: string[];
  }>;
}
```

逻辑 ID 采用 `invitation.background`、`pets.apricot`、`duet.male`、`duet.female`、`pride.cub.atlas`、`finale.cake`、`memory.01` 等稳定名称。**这些是接口约定，不表示资产现在已经存在。**

`getAssetUrl(id, variant = "standard")` 由 Codex 实现并交接。Claude 调用逻辑 ID，不在组件中拼域名。lite 缺失时可使用同资产 standard；必需资产 ID 缺失必须报具体错误，不返回空字符串让页面假装正常。

统一规则：

1. manifest 通过 `assetUrl("asset-manifest.json")` 从当前站点获取；一次体验固定使用同一个 release，不在半途切到新版本。
2. `assetUrl()` 保持本地静态资源职责；新增媒体 URL 层，不粗暴改变全部旧调用语义。
3. 资源根为空时，根据 `import.meta.env.BASE_URL` 得到 `media/` 根；远程根仅允许配置中的可信 HTTPS 根。只在本地开发允许明确的 localhost HTTP。
4. URL 使用标准 URL 规则和一致的路径编码；拒绝路径穿越、协议相对 URL、反斜线、重复编码绕过和未知来源。
5. 同一内容重发不覆盖旧 release 对象；版本路径不可变。`sha256` 由工具计算，不人工编造；S3 multipart ETag 不能等同于文件 SHA-256。
6. GLB 的外部贴图、atlas 的页面 JSON、解码器 WASM/JS 和 Worker 路径一并核对。不能只迁走 GLB，留下仍指向旧目录的依赖。
7. DOM 网图、录音和个人内容也通过同一逻辑资源入口；源码中不要散布另一套远程图床 URL。

### 5.4 发布原子性：先资源，后引用

```text
Claude 准备确定版本的运行资产
 → 本地检查与许可登记
 → Codex 上传新的不可变 R2 release
 → 校验必要对象、大小、内容类型和可读取性
 → 保存 release manifest 与 ready 记录
 → Git 中引用该 release
 → 构建站点并嵌入该 manifest
 → 部署预览
 → 验收后部署生产
```

资产上传失败时停止，不部署指向半成品 release 的网站。只改界面代码时复用已批准 release，不全量重传。`ready` 记录最后写入，但不能只凭它存在就替代首次完整校验。

## 6. GitHub 与 Cloudflare 的实际配置步骤

### 6.1 选择一条部署入口

**新项目默认采用 GitHub Actions 构建 + Wrangler Direct Upload 到 Pages。** 这样代码检查、媒体就绪校验、站点构建和发布顺序在同一条流水线上控制，避免 Pages 自动构建抢在媒体上传完成前上线。[C06–C07]

Cloudflare 的 Direct Upload 项目不能直接转换成 Git integration 项目；需要换模式时可能要新建项目。已有 Git 集成项目不要擅自重建，先核实是否可禁用其自动构建、转由 Wrangler 手动部署。不要同时启用两条互相竞争的生产发布链。

这里的“Direct Upload”是开发者通过 CI 上传成品，与收礼人下载文件没有关系。

### 6.2 Pages 项目

用户登录 Cloudflare 后，在 Workers & Pages 里建立或选取真实 Pages 项目。项目名建议短、可读，例如 `shibaby-dream`，实际是否可用由控制台返回；不能预先声称该子域名一定可注册。

首次建立项目时确认 production branch 为 `main`。Wrangler 放入项目开发依赖并锁版本，不在 CI 中长期使用无固定版本的 `@latest`。

以下是待配置完成后执行的命令形式，不代表已经运行：

```bash
npx wrangler pages project create <真实项目名> --production-branch main
npx wrangler pages deploy dist --project-name <真实项目名> --branch preview
# 生产：仅在授权与验收后
npx wrangler pages deploy dist --project-name <真实项目名> --branch main
```

执行者以锁定版本的 `--help` 核实一次参数。Cloudflare 控制台中设置的前端构建变量不会自动出现在 GitHub Actions；采用本方案时，要在 Actions 的实际 build step 注入公开 `VITE_*` 值。[C06–C07,C11]

### 6.3 R2 桶与公开范围

建立专用 `birthday-card-assets` 桶或等价名称，选择 Standard。只上传可公开的示意图、授权素材与优化后的运行资产。

制作原件、私人照片、私人录音和 `.blend` 不放入这个公开桶。后续需要保护私人内容，应采用另一个不公开的桶 / 前缀和真正鉴权路径；不应把整个公共桶突然改造成“前端口令保护”。

主方案的 R2 Custom Domain 会公开可访问对象；CORS、无目录列表和难猜 URL 都不是鉴权。[C04,C08]

### 6.4 自定义域名

先区分“自选 `*.pages.dev` 子域名”和“拥有自己的注册域名”。例如 `dream.example.com` 需要用户拥有 `example.com`；不承诺免费发放任意 `.com`。

Pages 的自定义根域需要该域名以 Cloudflare zone 管理；子域可以按官方方式使用外部 DNS CNAME，但仍应先在 Pages 的 Custom domains 里添加域名，而不是只改 DNS。[C09]

R2 Custom Domain 要求对应域名已作为 zone 加入**与桶相同的 Cloudflare 账户**。本项目免费路线优先采用 Cloudflare 完整 DNS 托管；不把对部分付费计划开放的 partial/CNAME zone 接入当作免费通用路径。[C04]

操作顺序：

1. 核实域名所有权、当前 DNS 和 Cloudflare 账户；记录现有 DNS，不动邮箱和其他业务记录。
2. 用户授权后，按其 DNS 方案接入 Cloudflare；nameserver / DNSSEC 改动单独处理并复核。
3. Pages 中添加 `dream.<域名>`，按系统指引建立记录，等待域名和 HTTPS 状态生效。
4. R2 桶中添加 `assets.<域名>`，由 R2 域名绑定流程建立记录；不要自行 CNAME 到 S3 API 或 `r2.dev`。
5. 用真实域名更新构建变量和 CORS，重新构建预览并检查。
6. 确认主域名工作后再考虑默认 `pages.dev` 的重定向；不要把预览 URL 一并错误重定向到生产。

## 7. 凭证、权限与安全

### 7.1 凭证分离

- Pages 部署 Token：按官方 Pages CI 指引，限定正确账户的 Pages Edit；不要使用 Global API Key。权限若只能账户级而不能项目级，应如实记录范围，不假称仅对一个项目生效。[C07]
- R2 上传凭证：Object Read & Write，限制到专用桶；S3 凭证仅用于 S3-compatible API。它与 Cloudflare REST API Token 不是同一种调用方式。[C10]
- 只需要验证远端清单的任务使用只读权限，能在公开域名验证的就不额外发写权限。
- DNS / zone 管理如确有自动化需求，使用单独、短期、最小权限授权，不混入日常站点部署 Token。

`R2_ENDPOINT` 使用账户实际 endpoint；特殊 jurisdiction 桶采用对应 endpoint。不能把 `<account>.r2.cloudflarestorage.com` 当作浏览器公共资源域名。[C10]

### 7.2 Actions 环境

建议建立 `cloudflare-preview` 与 `cloudflare-production` 环境；production 有可用的审批规则则开启，并限制可信分支。仓库套餐不支持相关审批功能时，使用受控 `workflow_dispatch` 和维护者权限作为显式门禁，不声称未配置的审批已生效。[C12]

配置入口：GitHub 仓库的 `Settings → Environments` 中建立环境；把生产所需凭证放在对应环境的 Secrets，公开参数放 Variables。仓库级入口是 `Settings → Secrets and variables → Actions`，不要把环境级值与仓库级值混淆。工作流 job 必须声明正确的 `environment` 才能取得环境配置；名称一致后再测试。[C12]

Secrets 只在需要它的上传 / 发布步骤注入。PR 构建、格式检查和截图测试不获得生产写凭证。不用 `pull_request_target` 去执行不可信 PR 的代码。不把密钥写到 Job summary、命令回显、截图或构建 artifact。

默认 `GITHUB_TOKEN` 为 `contents: read`；只有确实发布 GitHub Deployment 记录的 job 才增加必要写权限。无 OIDC 用途时不增加 `id-token: write`。

锁定依赖；正式工作流把第三方 action 固定到核验过的完整 commit，并注释版本。不要在文档里编一个不存在的 commit。不要为省几行直接执行未知来源的 `curl | bash`。

## 8. 资源打包、上传和本地制作衔接

### 8.1 不能遗漏本地资产交接

Claude 在用户电脑上生成的 `.asset-build/runtime/` 不会因为 GitHub Actions checkout 而自动存在。Codex 必须支持以下一种或两种明确路径，不能写一条 CI 假装它能读用户磁盘。

**主推荐：本地资产发布 + CI 站点发布。** 本地脚本检查运行包，预览上传计划，获准后上传 R2，生成小型 release manifest。Git 仅提交 manifest / lock 和代码；Actions 验证该 release 已就绪后构建站点。

**可选：受信任资产构建 job。** 从明确、许可允许的输入或用户提供的构建 artifact 生成运行资产，再上传。不要让每次改 CSS 都启动 Blender 全片渲染。

### 8.2 需实现的命令接口

命令名字可与仓库现有脚本合并，但下面能力必须存在；添加后在 `package.json` 与文档中使用同一名字。

```text
npm run assets:prepare -- --release <id> --source <明确目录> --mode local|remote
npm run assets:check -- --manifest <清单路径>
npm run assets:publish -- --release <id> --source <明确目录> --dry-run
npm run assets:publish -- --release <id> --source <明确目录> --apply
npm run assets:verify-remote -- --release <id>
npm run deploy:check -- --dir dist
```

工具要求：跨平台路径、清楚的中文错误；默认 dry-run；拒绝空 release / 根桶操作 / 路径穿越；按清单上传，不扫描任意父目录；限定并发和重试次数；不打印密钥；不使用 `sync --delete` 自动删远端内容。

一个文件首次打包计算校验值即可，后续用已验证清单复用。完整首次校验后，普通 UI 发布仅检查被引用 release 和必要对象，不重复下载整个桶核对哈希。

### 8.3 文件元信息

| 文件 | 典型 Content-Type | 要点 |
| --- | --- | --- |
| `.glb` | `model/gltf-binary` | 是浏览器请求的数据，不设 attachment。 |
| `.gltf` / `.json` | `model/gltf+json` / `application/json` | JSON 必须能被解析，不能拿到 SPA HTML。 |
| `.ktx2` | `image/ktx2` | KTX2 解码 / 转码器文件同时可达。 |
| `.webp` / `.avif` / `.png` | 对应 image 类型 | 需要透明通道的图集检查 alpha 和边缘。 |
| `.mp3` / `.m4a` | `audio/mpeg` / `audio/mp4` | 音频按实际封装设置类型，支持需要的范围请求。 |
| `.wasm` | `application/wasm` | MIME 正确，配套 JS 版本匹配。 |
| `.woff2` | `font/woff2` | 只发布许可允许的网页字体子集。 |

`Content-Encoding` 仅当文件确实以对应方式编码时设置；不要把普通 GLB 误标 gzip。只有版本化且不可变的发布资产设置 `Cache-Control: public, max-age=31536000, immutable`。未版本化 manifest、HTML 不能套用一年不变。

## 9. CORS、缓存与响应头

### 9.1 R2 CORS

下面为**控制台 / S3 风格**的示例；替换真实站点源后使用。Wrangler 的 CORS 配置结构不同，不能把同一 JSON 原封不动传给两套入口。[C08]

```json
[
  {
    "AllowedOrigins": [
      "https://dream.example.com",
      "https://shibaby-dream.pages.dev",
      "https://preview.shibaby-dream.pages.dev",
      "http://localhost:5173"
    ],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range", "If-None-Match", "If-Modified-Since"],
    "ExposeHeaders": ["ETag", "Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 3600
  }
]
```

Origin 仅包含协议、域名和可选端口，不能带 `/birthday-card/`。预览域名按实际输出加入；使用域名模式时按当前文档验证其规则，不能假定所有通配符均可用。生产不启用前端上传，不给浏览器 PUT / DELETE 能力。

CORS 只约束浏览器跨源读，不阻止别人直接访问公开对象。`fetch(..., {mode: "no-cors"})` 不是解决方法；得到 opaque response 后，模型 / 音频解码仍可能失败。

测试时带真实 `Origin`。不带 Origin 的 curl 没有 CORS 响应头，不能直接判为配置失败。修改 CORS 后还应检查 CDN 缓存版本，必要时只清理受影响对象。[C08]

### 9.2 CDN 缓存

绑定 R2 自定义域名后，不能假定所有扩展名自动命中缓存。对 `assets.<域名>/birthday-card/releases/*` 设置合适 Cache Rule，覆盖 GLB、KTX2、atlas JSON 和音频，尊重明确的源缓存策略。首次 MISS 正常，后续状态仍需实际检测。[C04]

不要缓存上传 API、带鉴权的私人响应或错误页面。不要把 403 Challenge、404 或未就绪 manifest 缓存为正常素材。缓存配置必须以路径 / 主机范围隔离，不更改整个账户的防护策略。

### 9.3 Pages 响应头

在 `public/_headers` 维护静态响应头，至少考虑：版本化 JS/CSS 长缓存，HTML 和根 manifest 重新验证，`X-Content-Type-Options: nosniff`，合适的 Referrer-Policy；预览版加 `X-Robots-Tag: noindex`。

隐私声明必须准确：noindex 只是搜索提示，不是访问保护。

CSP 先按实际依赖梳理并在预览验证；Three/Pixi 解码器可能使用 Worker / WASM，图片、音频、模型来自资源域。不能为了“安全”盲目设置会阻断它们的策略，也不为省事加入无限制的 `*` / `unsafe-eval`。需要的最小例外写明原因。

麦克风默认不使用；相机只供主动选择的手势。Permissions-Policy 不应误禁所有相机后再声称手势可用。不默认启用 COEP/COOP，除非明确使用需要跨源隔离的能力，并已协调所有资源响应头。

`_headers` 只作用于 Pages 静态响应，不会自动作用于 R2 自定义域名或 Functions 生成的响应；后两者要分别配置。[C13]

## 10. 无域名 R2 网关：仅需要时实现

在 Pages 项目中绑定专用 R2 为 `BIRTHDAY_ASSETS`；生产和预览分别核实绑定。[C14]

路由使用 `functions/media/[[path]].ts` 或等价 catch-all。`/media/releases/...` 映射到桶内 `birthday-card/releases/...`。浏览器端 `VITE_ASSET_BASE_URL` 可保持空值，仍请求本站 `media/`。

`dist/_routes.json` 的目标是只让媒体路径进入 Function：

```json
{
  "version": 1,
  "include": ["/media/*"],
  "exclude": []
}
```

本模式的网站 JS、CSS、HTML 不应该进入网关。路由规则按实际构建检查；否则所有静态访问可能消耗 Functions 配额。[C15]

网关必须：

- 只允许 GET / HEAD；拒绝写入和桶列表操作。
- 校验 release 路径与允许前缀，防止任意桶内文件暴露；不给客户端指定目标域名，不能变成开放代理。
- 使用 R2 binding，不把 S3 凭证发到浏览器。
- 流式传输对象，禁止整文件读入 `ArrayBuffer` 再返回；不得每次请求重压缩模型 / 音频。
- 正确处理不存在的对象、Content-Type、ETag / 条件请求、HEAD 和需要的 Range / 206 / 416；复用官方 API 行为并覆盖测试，不手写未经验证的半套 HTTP。
- 缓存策略仅针对公开、不可变资源；使用 Cache API 时也要记录 Function 调用仍发生，不能说缓存命中就完全不计动态请求。
- 对错误保留真实 HTTP 状态，不返回 `index.html` 伪装素材。

最初只处理公开 demo 素材。**“R2 桶私有 + 一个无鉴权读取网关”仍然会公开网关允许的文件，不等于真正私密。** 将来做私人访问时，必须保护网站、清单和媒体，并关闭可绕过鉴权的公开入口。

## 11. CI/CD 工作流设计

### 11.1 三类流程，不重复建设

| 流程 | 触发 | 任务 | 是否需要发布密钥 |
| --- | --- | --- | --- |
| `ci.yml` | PR / 可信分支 | 安装、相关测试、类型与构建、manifest schema、本地路径与轻量 smoke | 不需要。 |
| 资产发布 | 本地明确命令，或受控手动 job | 验证运行包、上传新 R2 release、写 ready 记录、输出 release manifest | 仅该步骤需要 R2 写凭证。 |
| `deploy-cloudflare.yml` | 初期手动；批准后 `main` push | 验证已发布资产版本、构建站点、检查 `dist`、Pages 预览 / 生产发布、线上 smoke | 仅发布步骤需要 Pages Token。 |

避免 Pages 原生 Git 自动构建与 GitHub Actions 同时对同一站点生产发布。迁移期旧 GitHub Pages 工作流可改为手动，但必须在新站确认可用且获准后再停用自动更新。

### 11.2 站点发布顺序

1. checkout 正确 ref；记录短版本标识一次。
2. 使用锁定且与现有依赖兼容的 Node 和 `npm ci`。不要无关升级整个前端工具链。
3. 读取已批准的 `assets/release.lock.json`，核实 schema、release 与 ready 状态；素材仍缺失则明确失败。
4. 从 release manifest 生成 `public/asset-manifest.json`；不拉全部 R2 资源到 `dist`。
5. 运行与改动相关的检查；生产必要的类型 / 测试 / 构建 gate 保留。
6. 显式注入 `VITE_APP_BASE=/`、实际资源根及 content mode，再构建。
7. `deploy:check` 检查 dist 文件数、单文件上限、敏感文件、错误域名、source map 内容与 manifest。
8. 使用 Wrangler 部署；production 与 preview 明确区分，不根据模糊分支推测。
9. 线上只做必要 smoke：首页、manifest、一张图片、一个模型或 atlas、音频与解码器代表资源；检查真实 HTTP 状态 / MIME / CORS。
10. 输出站点 URL、部署 ID、代码 ref、asset release、检查结论、尚需真机确认的项目。

生产使用独立 concurrency group，避免旧 job 最后覆盖新版本。默认不在上传半途强制取消生产发布；排队完成，并在发布前确认该版本仍是被批准的目标。

### 11.3 旧影片门禁迁移

不要把整个 `cinema:validate` 直接删除后称为完成。先判断哪些章节仍在使用旧片，哪些已由 Claude 的新资源替代；新测试覆盖核心交互和 manifest 后，把旧影片验证移至 legacy 专用命令。

生产包不得夹带大量不再引用的 `public/cinema/`、旧犬片和中间试帧。移除应以引用与新场景验收为依据，源历史可留 Git 历史或本地归档，不能删掉唯一仍有效的资产。

## 12. 让部署服务于“前端流畅”

Codex 不负责把角色改漂亮，但必须保证交付链路不会破坏 Claude 做好的表现。

- 首屏只加载应用外壳、有效入口、必要绘景与一小段可交互内容。不能因 manifest 列出 100 个资产就 `Promise.all` 全部下载。
- 预取顺序由 Claude 的 `bundles` 与舞台调度器决定；部署端只提供稳定 URL、正确压缩和缓存，不自行增加全站 preload。
- 同一时间只准备当前场景和下一段必要资源；图片解码、GLB 解析、WASM 转码和 GPU 上传也消耗时间，不把“HTTP 200”当作“马上可以丝滑换章”。
- 代码分块和解码器路径经实际构建检查；相机手势模块按需加载，不拖累默认触摸首屏。
- 初次使用字体时不让页面突然跳版；正文能先用合适系统字体，定制字体与主要版式策略由 Claude 决定。
- Service Worker / PWA 不是本轮必需。没有完整版本切换和清理策略时不要加入，避免旧缓存继续引用被删掉的资源。
- 不通过自动安装 App、强制保存到手机、切播放器或一次下载整个资源包解决加载问题。

首轮冷缓存网络测试固定为明确条件，如 20 Mbps / RTT 80 ms；目标为约 3 秒见到有效首屏、约 5 秒核心入口可操作。条件与实测结果必须一同报告。这不是对所有地区 / 所有网络的时间保证。

## 13. 回滚与资产保留

Cloudflare Pages 支持回滚至先前的生产部署；此动作不会替你恢复已删除的 R2 对象。[C16]

因此：

1. 每个站点部署包含自己的 manifest，固定引用对应 release。
2. 至少保留当前正式版本及前两个已批准版本所需资源；未确定保留策略前不自动清理。
3. 清理先生成 dry-run 清单：列出仍被生产、候选预览或回滚版本引用的 release。
4. 仅清理明确无引用且超过约定保留期的对象；需要用户批准后再执行。
5. 回滚先选择前一生产站点部署，再验证其媒体 key 仍可读。不临时改 `latest.json` 让半数用户读不同版本。
6. GitHub Pages 在新站验收之前仍可作为旧站应急链接；旧站保留不等于新方案采用旧视频效果。

## 14. 验收清单

| 编号 | 检查 | 通过条件 |
| --- | --- | --- |
| DEP-01 | 本地根路径 | 不配置 Cloudflare 密钥，也能预览一个完整新样章。 |
| DEP-02 | Pages 根路径 | `/` 下 JS、CSS、图片、manifest、解码器均正确，无 `/birthday-card/` 残留误拼。 |
| DEP-03 | 迁移期子路径 | 显式 `/birthday-card/` 构建仍可运行；不与根路径产物混发。 |
| DEP-04 | 远程资产 | 模型 / atlas / 图集页 / 音频能真实解码，不只是 URL 返回 200。 |
| DEP-05 | CORS | 带真实 Origin 的允许站点可读；没有路径级 Origin 错配，不用 no-cors 绕过。 |
| DEP-06 | 缓存 | 版本化对象适当长缓存，HTML / manifest 可更新；错误页面不当素材缓存。 |
| DEP-07 | 免费路线 | Pages / R2 / Functions 费用项分开说明；没有自动启用收费产品。 |
| DEP-08 | 密钥 | Git diff、dist、日志及上传包没有 Secrets / 私人原件。 |
| DEP-09 | 发布先后 | 模拟素材缺失时拒绝上线新引用，旧生产版本仍可访问。 |
| DEP-10 | 回滚 | 站点与资源版本一起回到可用状态，无 404。 |
| DEP-11 | 移动端网络 | 冷缓存 / 热缓存 / 一项资源失败均有记录；不把桌面缓存结果冒充 iPhone 冷启动。 |
| DEP-12 | 云端完成状态 | 清晰区分“文件已写”“本地已测”“预览已部署”“自定义域已生效”“生产已批准”。 |

构建和 HTTP smoke 不代替审美、触摸手感或 iPhone GPU 性能验收；这些与 Claude 的 EXP / VIS / PERF 门禁一起完成。

## 15. 故障定位速查

| 现象 | 优先检查 | 禁止的“修复” |
| --- | --- | --- |
| Pages 首页打开，JS 404 | Vite base、构建变量实际注入位置、dist 引用 | 在所有路径前硬加域名。 |
| 模型 200 却解析失败 | 是否返回 HTML、MIME、版本配套、GLB 外链贴图 | 仅因状态码成功就标完成。 |
| 预览可用，自定义域不可用 | Pages Custom domains 状态、DNS / HTTPS、CORS Origin | 一次删除并重建整个 zone。 |
| 图能看，WebGL 纹理不能用 | CORS、Origin、纹理格式 / alpha、解码器 | `no-cors` 或关闭浏览器安全。 |
| 更新不生效 | manifest、immutable 文件是否被覆盖、SW、CDN 旧缓存 | 给所有资源随机时间戳永久禁用缓存。 |
| R2 403 | 使用的 API、Token 权限、桶范围、public domain 与 S3 endpoint 区别 | 扩大为 Global API Key。 |
| 字体 / WASM 加载失败 | MIME、CSP、路径、跨源策略 | 对整站无限开放所有来源。 |
| 切章卡顿 | 网络之外的解析 / 解码 / 上传和双场景驻留 | 自动改成完整 MP4。 |
| GitHub 部署成功但新域名还是旧版 | 是否发布到错 project / branch、是否双部署链竞争 | 反复无改动重跑所有 Actions。 |

## 16. 分批交付与给用户的最终说明

建议四批，每批可运行、可回滚：

**D1：共享契约。** 环境变量、base、本地资源入口、manifest schema、最小样例、相关测试；把接口交给 Claude。

**D2：媒体发布。** prepare / check / dry-run / publish / verify，R2 配置模板、CORS 与缓存说明；确认本地资产确实可交给 CI。

**D3：Pages 与预览。** 单一发布链、dist 检查、预览 URL、真实资源 smoke；域名未知时先完成默认域名路径。

**D4：生产与回滚。** 在账户授权、真实配置与上线批准后，启用生产部署，验证自定义域、保留策略和回滚，更新操作手册。

最终交付要包含：改动文件、执行过的命令与结果、预览 / 生产 URL（真实存在才写）、剩余用户动作、免费额度与可能收费项、回滚步骤、给 Claude 的契约版本。不要只回复“配置好了”。

缺失信息集中询问一次：Cloudflare 是否已开通 R2、是否已有域名、Pages 项目名偏好、能使用的授权方式。密钥让用户直接录入平台 Secrets 或本机会话，不要求明文发在聊天里。

## 17. 官方依据与核验来源

下列是外部平台 / API 事实依据；架构、命名、分工、预算和流程为本项目设计，不是 Cloudflare 的官方模板。读取日期为 2026-09-25。

- [C01] Pages 限制：<https://developers.cloudflare.com/pages/platform/limits/>
- [C02] R2 定价与 Standard 免费层：<https://developers.cloudflare.com/r2/pricing/>
- [C03] R2 开通流程：<https://developers.cloudflare.com/r2/get-started/>
- [C04] R2 公共桶、Custom Domain 与 r2.dev：<https://developers.cloudflare.com/r2/buckets/public-buckets/>
- [C05] Pages 静态 / Functions 计费：<https://developers.cloudflare.com/pages/functions/pricing/>
- [C06] Pages Direct Upload：<https://developers.cloudflare.com/pages/get-started/direct-upload/>
- [C07] GitHub Actions / CI 与 Wrangler：<https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/>
- [C08] R2 CORS 与两种配置格式：<https://developers.cloudflare.com/r2/buckets/cors/>
- [C09] Pages 自定义域名：<https://developers.cloudflare.com/pages/configuration/custom-domains/>
- [C10] R2 Token / S3 权限：<https://developers.cloudflare.com/r2/api/tokens/>
- [C11] Vite 环境变量及 BASE_URL：<https://vite.dev/guide/env-and-mode>
- [C12] GitHub Actions Secrets：<https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets>
- [C13] Pages 静态响应头：<https://developers.cloudflare.com/pages/configuration/headers/>
- [C14] Pages Functions R2 binding：<https://developers.cloudflare.com/pages/functions/bindings/>
- [C15] Functions 路由：<https://developers.cloudflare.com/pages/functions/routing/>
- [C16] Pages 回滚：<https://developers.cloudflare.com/pages/configuration/rollbacks/>
- [R01] 本次读取的 Vite 配置：<https://github.com/daidaideaa/birthday-card/blob/main/vite.config.ts>
- [R02] 本次读取的静态资源 helper：<https://github.com/daidaideaa/birthday-card/blob/main/src/utils/assetUrl.ts>
- [R03] 本次读取的旧工作流：<https://github.com/daidaideaa/birthday-card/blob/main/.github/workflows/pages.yml>

**收尾原则：部署应让好看的前端可靠出现，而不是把更大的素材仓库误当成电影感本身。**
