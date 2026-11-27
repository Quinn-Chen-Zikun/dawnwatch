# 破晓守望 · 可选云存档接入说明

## 当前状态（重要）

- **本地存档是默认且完整的。** 不配置云端时，游戏照常创建档案、保存军费/武器/剧情/最佳波次/设置，并可导出/导入 JSON。
- **云存档前端已经实现，但本仓库没有配置任何真实云服务。** `js/cloud-config.js` 中的项目 URL 与 publishable key 默认都是空字符串。默认打开游戏时：
  - 不加载 Supabase SDK；
  - 不发出任何外部网络请求；
  - 档案窗口的云存档区**只显示「云存档尚未配置。」**，不显示邮箱输入框，也不要求登录；
  - 本地档案、切换、导出、导入完全可用。
- 本仓库**没有**创建 Supabase 项目、没有部署数据库、没有写入任何 URL、密钥或账号，也没有执行过真实网络请求。`cloud/save-schema.sql` 只是需要项目所有者自行执行的准备脚本。
- **接入代码完成不等于云同步已上线。** 真正可用需要用户自己的 Supabase 项目、公开 publishable key、执行 SQL、配置邮箱 OTP 模板，并做双账号实测。
- 网页端只应使用 Supabase 的 **publishable key**（`sb_publishable_...`）。`service_role` / `sb_secret_...` 密钥绝不能出现在浏览器代码、备份文件或仓库中。

## 前端文件与职责

| 文件 | 职责 |
| --- | --- |
| `js/cloud-config.js` | 唯一的云配置：默认空的 `url` 与 `publishableKey`；校验 HTTPS 项目 URL、只接受 `sb_publishable_`、拒绝 secret/service_role |
| `js/cloud-sync.js` | 官方 SDK 同源按需加载、`createClient`、`getUser` 身份、RLS 表读写、云存档信封与 128 KiB 限制 |
| `js/cloud-ui.js` | 档案窗口中的 OTP 登录/退出与手动上传/下载界面；未配置时不加载 SDK |
| `js/profiles.js` | 本地档案与备份；额外导出 `window.DawnProfileBackup`，供云 UI 复用白名单校验和“导入为全新档案”逻辑 |
| `index.html` | 档案窗口内的云存档区和一个 `type="module"` 的 `cloud-ui.js` script |
| `cloud/save-schema.sql` | 需要用户在真实 Supabase 项目 SQL Editor 中执行的表、触发器与 RLS |

### 按需加载 SDK

- 官方 SDK 的 UMD 包应放在 **同源** 路径 `vendor/supabase/supabase.js`（仓库已包含官方 2.119.2 UMD 构建及其 MIT 许可证和完整性哈希）。
- `js/cloud-ui.js` 只有在配置有效且用户主动点击云功能时，才由 `js/cloud-sync.js` 动态插入 `<script src="vendor/supabase/supabase.js">`。
- 加载后要求全局存在 `window.supabase.createClient`，并使用官方 `createClient`。
- 未配置时不会插入该 script；加载失败会明确提示，不会假装云存档可用。

## 配置方式（项目所有者自行填写）

编辑 `js/cloud-config.js`：

```js
export const CLOUD_CONFIG=Object.freeze({
  // 例：'https://your-project-ref.supabase.co'
  url:'',
  // 例：'sb_publishable_xxx'
  publishableKey:''
});
```

校验规则：

- `url` 必须是非空、可解析的 **HTTPS** 项目根地址；不接受用户名/密码、路径、查询参数或 `#`。
- `publishableKey` 必须是 `sb_publishable_` 开头的公开 key。
- 显式拒绝 `sb_secret_`、包含 `service_role` 的字符串，以及 payload 中 `role = service_role` 的 JWT。
- 本版本不接受旧式 `anon` JWT；请使用 Supabase 新式的 publishable key。

配置不完整或无效时，界面会显示“云存档配置无效：…”，并且不会加载 SDK、不会联网。默认两个字段为空时只显示“云存档尚未配置。”。

## 真实 Supabase 项目配置步骤

以下步骤必须由项目所有者使用真实 Supabase 项目执行；本仓库无法代替这些外部操作。

1. 在 Supabase 创建项目，等待数据库就绪。
2. 在 Authentication 中启用 **Email** 登录。本项目使用邮箱一次性验证码（OTP），不是邮箱密码。
3. 打开 Authentication → Email Templates，把需要使用的邮件模板配置为包含 **`{{ .Token }}`**。如果模板只包含 magic link 而没有 Token，用户将收不到可输入的数字验证码。
4. 按项目需要设置 Site URL、OTP 有效期、发送频率限制，以及是否允许新用户注册。前端发送 OTP 时使用 `shouldCreateUser: true`，因此项目关闭注册时会明确失败。
5. 打开 SQL Editor，完整执行 `cloud/save-schema.sql`。确认没有报错。
6. 在 Table Editor 或 SQL 中确认 `cloud_saves` 的 RLS 已开启，且 `anon` 没有表权限。
7. 确认仓库自带的官方 `@supabase/supabase-js` 2.119.2 UMD 构建位于 `vendor/supabase/supabase.js`。不要从第三方 CDN 动态加载，也不要把构建产物之外的密钥写进仓库。
8. 在 `js/cloud-config.js` 填入 Project URL 与 **publishable** key（不是 service_role）。
9. 用两个真实邮箱账号做隔离测试（见下文）。

## 用户操作流程

只有当配置有效时，档案窗口才显示云存档登录区：

1. 点击“发送验证码”：调用 `auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`。
   - 邮箱和验证码不会被日志记录、打印或写入存档。
   - 失败时显示分类提示（频率限制、邮箱无效、网络问题、项目未开放注册等），不展示原始服务端细节。
2. 输入邮件中的数字验证码，点击“验证并登录”：调用 `auth.verifyOtp({ email, token, type: 'email' })`。
   - 登录成功后再调用正式 SDK 的 `auth.getUser()` 确认当前用户；不信任前端自报身份。
3. 登录后可以：
   - **上传当前档案**：读取当前本地档案的白名单键，先查询云端是否已有记录。若已有，界面展示服务端 `updated_at`，并要求再次点击“确认覆盖并上传”；覆盖前还会重新检查云端更新时间，实际写入使用按该更新时间过滤的原子 UPDATE，避免其他设备在确认后写入的新版本被覆盖。若检查时云端没有记录，首次写入使用 INSERT 而不是 UPSERT，因此万一其他设备刚刚创建了记录，会因主键冲突失败并提示重新确认，而不是静默覆盖。
   - **从云端下载为全新档案**：只创建新的独立本地档案，绝不覆盖当前档案或旧档案。下载后不会自动切换；用户可自行点击新档案的“切换”。
   - **退出登录**：调用 `auth.signOut({ scope: 'local' })` 清除本地登录会话，之后云按钮隐藏，云操作停止。
4. “检查已有登录状态”用于页面刷新后主动恢复 SDK 已保存的会话。它不会在页面加载时自动联网。

云同步是**明确的手动上传/下载**，没有自动同步、自动合并、后台重试或冲突合并承诺。云端记录冲突由用户确认覆盖处理。

## 数据格式与校验

### 上传信封

`cloud_saves.save_data` 使用固定信封，只包含存档数据：

```json
{
  "format": "dawnwatch-cloud-save",
  "version": 1,
  "data": {
    "blackout-armory-v1": "{\"credits\":1200,\"owned\":[\"rifle\",\"pistol\"]}",
    "blackout-map": "yard",
    "blackout-story-progress": "2"
  }
}
```

- 信封只允许 `format`、`version`、`data` 三个字段；版本必须为 `1`。
- `data` 中的键与值必须通过 **P0 已有的 `DawnProfileBackup.validateEntries`** 校验：白名单键、字符串值、数值范围、剧情一致性、白名单地图等。
- 云 UI 不复制另一套存档规则；`js/cloud-sync.js` 也不提供自己的键白名单，必须传入本地校验器。
- 云端信封序列化后不得超过 **128 KiB（131072 字节）**；单项值也限制 128 KiB；最多 32 个存档键。
- 本地备份上限是 **192 KiB**，因此接近上限的本地档案可能无法上传。此时会明确失败，不会截断数据。
- `save_data` 不包含档案显示名、邮箱、用户昵称、头像、token、IP 或设备标识。档案名只保存在浏览器本地。

### 数据库列

| 列 | 类型 | 说明 |
| --- | --- | --- |
| `user_id` | `uuid` | 客户端只从 `auth.getUser()` 取得，不接受外部传入；RLS 再次强制 |
| `slot` | `text` | 前端固定使用账号默认槽 `default` |
| `schema_version` | `integer` | 当前为 `1`；后端约束 1–100 |
| `save_data` | `jsonb` | 上述信封；序列化后 ≤ 128 KiB |
| `created_at` | `timestamptz` | 服务端写入 |
| `updated_at` | `timestamptz` | 服务端触发器写入，客户端提交值会被覆盖 |

## 后端 schema 与 RLS

执行 [`cloud/save-schema.sql`](../cloud/save-schema.sql)。核心设计：

- 表：`public.cloud_saves`
- 主键：`(user_id, slot)`，每个用户每个槽位一条记录
- 外键：`user_id -> auth.users(id)`
- 约束：slot 格式、schema_version 范围、`save_data` 必须是 JSON 对象、序列化 ≤ 131072 字节、`updated_at >= created_at`
- 触发器在服务端写入时间戳；UPDATE 时禁止修改 `user_id`，并保留 `created_at`
- RLS 只允许 `authenticated`：
  - SELECT：`using (auth.uid() = user_id)`
  - INSERT：`with check (auth.uid() = user_id)`
  - UPDATE：`using (auth.uid() = user_id) with check (auth.uid() = user_id)`
- 权限只授予 `authenticated` 的 `select, insert, update`；`anon` 与 `public` 没有表权限；没有 DELETE 策略或 DELETE 授权

客户端还会在查询/写入时显式带上 `user_id = getUser().id` 与 `slot = 'default'`，作为 RLS 之外的第二道防线；但真正的隔离必须依靠 RLS。

## 安全边界

- 浏览器端只放 publishable key。service_role 会绕过 RLS，绝不能出现在前端。
- `createClientFromConfig` 在创建客户端前会再次执行配置校验，即使调用方绕过 UI，secret/service_role 密钥也会被拒绝。
- 不手写鉴权：身份只使用正式 SDK 的 `auth.getUser()`；`createCloudSaveSync` 不接受 `user_id` 参数。
- 不使用 `auth.getSession()` 的本地数据判断身份；服务端请求前都会 `getUser()`。
- OTP 邮箱、验证码、access token 不写入备份或云存档，不打印到控制台，也不放在 URL 中（`detectSessionInUrl: false`）。
- SDK 自己会在浏览器中持久化登录会话（localStorage）。这是 Supabase Auth 的行为；退出登录会清除本地会话。
- 下载只复用 `DawnProfileBackup.createProfileFromEntries`，其内部会再次执行白名单校验、档案数量上限检查和写入失败回滚。
- 云端记录格式、版本或大小不符时，上传/下载都会报错并停止，不会盲目覆盖。

## 测试建议

本仓库未运行真实网络请求，也未执行下列实机测试。可用 mock SDK 做前端逻辑测试；真实 RLS 验证必须使用真实项目。

### 无外部请求的本地检查

1. 保持 `js/cloud-config.js` 为空，打开游戏。确认档案窗口只显示“云存档尚未配置。”，没有邮箱输入框。
2. 在浏览器 Network 面板确认没有加载 `vendor/supabase/supabase.js`，没有任何 Supabase 请求。
3. 创建新档案、切换、刷新、导出、导入，确认本地功能全部正常。
4. 确认 `window.DawnProfileBackup` 存在，且其 `validateEntries` 与本地导入使用同一份规则。

### mock SDK 可覆盖的前端行为

1. 配置有效的假 URL 和 `sb_publishable_` 假 key，在点击云功能前确认 SDK 仍未被加载。
2. 模拟 `signInWithOtp` / `verifyOtp` 失败，确认显示明确失败提示且不泄露邮箱/验证码。
3. 模拟 `getUser()` 返回空，确认上传/下载被阻止。
4. 模拟 `pull()` 返回已有记录，确认上传只显示确认区、不立即写入；确认后才调用 `upsert`。
5. 模拟确认前 `updated_at` 变化，确认取消上传。
6. 模拟 `pull()` 返回带非法键、非法值、超 128 KiB 或错误版本的记录，确认拒绝下载。
7. 模拟下载成功，确认新增本地档案且当前/旧档案的 localStorage 键未改变。

### 真实项目 RLS 测试

以 postgres 身份在 SQL Editor 中查表可能绕过 RLS；应使用 REST API + 用户 JWT，或在事务中切换 `authenticated` / `anon` 角色。

1. **匿名拒绝**：只用 publishable key、不带用户 JWT 调 `GET /rest/v1/cloud_saves` 或尝试 INSERT，应被拒绝。
2. **用户 A 写入自己**：以 A 的 access token INSERT `user_id = A`，应成功。
3. **用户 A 伪造 B**：以 A 的 token INSERT `user_id = B`，应被 `with check` 拒绝。
4. **读隔离**：A 只能查到 `user_id = A` 的行；B 登录后查不到 A 的行。
5. **更新隔离**：B 尝试 `PATCH` A 的行应影响 0 行或被拒绝；A 更新自己的行成功。
6. **约束**：提交超过 128 KiB 的 `save_data`、`schema_version = 0`、非法 `slot`，应被数据库约束拒绝。
7. **时间戳**：INSERT/UPDATE 时即使客户端传入旧的 `updated_at`，返回的也应为服务端时间；UPDATE 不能改 `user_id`。
8. **删除**：DELETE 请求应被拒绝（未授予 delete 权限，也没有 DELETE 策略）。
9. **版本**：拉取 `schema_version` 不为 1 的记录时应拒绝并提示，不要盲目覆盖。
10. **双账号实测**：A 上传后，B 登录下载应看不到 A 的存档；A 重新登录后能看到自己的记录与更新时间。

## 仍需完成 / 本仓库无法验证的事项

- 真实 Supabase 项目、数据库部署、Auth 用户与邮箱 OTP 模板配置。
- 已固定并随仓库提供官方 UMD SDK 2.119.2；真实项目中的 SDK 网络调用仍需验证。
- 真实 publishable key 的注入与部署环境配置。
- 两账号跨用户 RLS 实机验证、配额、网络失败、OTP 频率限制与邮件送达测试。
- 任何真实云端数据的上传、迁移或部署。本仓库没有执行这些操作。
- 自动同步、后台重试、多设备冲突合并：**本阶段明确不提供，也不承诺**。当前只有手动上传/下载。
