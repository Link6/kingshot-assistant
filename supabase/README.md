# 房间服务

项目：`apthksvwesjebpguprvj`，组织 `Link6's Org`。创建时报价 $0/月；不升级付费计划。

仅允许 Discord 服务器 `1409235905629130915` 的成员使用房间。登录与服务器成员资格分别验证；不以客户端字段、隐藏按钮或可编辑的 user_metadata 作为权限依据。

## Discord 一次性设置

1. 在 https://discord.com/developers/applications 创建应用。
2. OAuth2 Redirects 添加 `https://apthksvwesjebpguprvj.supabase.co/auth/v1/callback`。
3. 在 Supabase Authentication → Sign In / Providers 启用 Discord，直接填 Client ID 和 Client Secret。不要将 Secret 写入仓库或聊天。
4. Authentication → URL Configuration 的 Site URL 和 Redirect URL 都填 `https://link6.github.io/kingshot-assistant/`。本地验证可额外允许 `http://localhost:4173/`。
5. 客户端请求 `guilds.members.read`，后端验证提供的 Discord token 与已认证 Supabase identity 相符，再查询指定服务器的当前成员身份。不需要机器人。

## 配额和权限

- 默认每人 1 个有效房间，全站最多 3 个，单房最多 30 人；6 小时后过期。
- 每人每分钟最多 60 次写入，全站每日最多 1000 次成功共享更新。
- 仅房主可任免指挥；房主和指挥可维护敌方、选择或手动添加车头，并设置各车头的集结准备时间。
- 房间成员默认是 joiner，不会因填写行军时间自动进入排程。成员只更新本人的行军时间；被选为车头后，该时间自动用于车头排程。尚未填行军的车头保留为空，补全后才能排程。
- 手动车头可不关联房间成员，其昵称、集结准备和行军时间由房主或指挥填写。移出车头名单不移除房间成员；关联成员离房后自动移出车头名单。
- 每 5 分钟重新核验 Discord 成员身份。验证过期后数据库拒绝请求；客户端不能绕过。
- Realtime 仅通知房间版本变化，不广播每帧倒计时。数据库快照包含绝对时间，客户端根据估算的服务器时差计算。
- 这些限制约束正常应用使用，不能替代平台层流量防护或保证所有 Supabase 计费项永不超额。保持免费计划，不自动升级。

## 资源

`rooms.sql` 是初始 schema，`harden-rooms.sql` 将特权例程移入非公开 schema，`configure-rally-leaders.sql` 分离房间成员和车头名单，依次执行。现有成员默认保持 joiner。远端变更需走命名 migration 并在改动前检查现有 tables。所有私有表和公开通知表开启 RLS，RPC 显式校验 auth.uid、短时 grant、房间成员及角色。Discord grant RPC 仅 service_role 可执行。

`discord-access` 函数在服务器核验 Supabase JWT、Discord 身份及服务器成员身份。service_role 和 Discord token 不写日志；客户端只保存 publishable key。

前端内置的官方 `@supabase/supabase-js` 版本固定为 `2.118.0`，许可证见 `dist/SUPABASE-LICENSE.txt`。Discord provider token 仅保留在当前标签页 sessionStorage 中；从 SDK 的持久化副本中移除，不上传到数据库。退出登录时清除。函数关闭网关旧 JWT 校验，入口内通过 Auth `/user` 验证每个 Supabase bearer token；没有匿名授权路径。

真实 PostgreSQL 权限测试在 `supabase/tests/rooms.sql` 和 `supabase/tests/leaders.sql`，使用事务回滚，不保留测试用户或数据。车头名单或车头时间变化后不会自动重生成已有集结排程，会按原有流程提示重新排程；joiner 更新行军不会使车头排程失效。
