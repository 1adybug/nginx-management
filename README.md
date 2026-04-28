# 项目介绍

`geshu-nginx-management` 是一个基于 `Next.js 16`、`Better Auth`、`Prisma + SQLite` 和 `Ant Design` 的 Nginx 管理后台。

当前项目支持：

- 用户登录、初始化管理员、用户管理
- 操作日志、异常日志
- 反向代理与 TCP / UDP 端口转发
- 自签证书生成、Nginx 配置测试与重载
- 运行时系统设置
- SQLite 自动备份与可选的 S3 / 兼容对象存储上传

## 环境变量

项目将启动、构建、认证核心配置，以及首次登录前就必须可用的默认邮箱域名和短信通道配置放在 `.env` 或部署平台环境变量中。验证码日志打印、限流、用户资料开关、自动备份和 Nginx 运行控制等配置请登录后台后在“系统设置”页面维护。

说明：

- 以 `NEXT_PUBLIC_` 开头的变量会暴露给浏览器，本项目当前无需额外暴露业务配置
- `NODE_ENV` 由运行命令和框架控制，一般不需要手动设置
- `BETTER_AUTH_SECRET` 在生产环境是强制项，未配置会导致服务启动失败；开发环境会使用仅本地可用的兜底值
- 默认邮箱域名、短信通道和密钥不会进入系统设置，避免首次进入系统时因无法登录而无法配置基础能力
- 系统设置中的“短信设置”只控制是否在服务端系统日志中打印验证码
- 系统设置中的配置不读取同名环境变量，首次初始化时只写入代码默认值

### 变量清单

| 变量名                        | 必填 | 说明                                            | 示例 / 默认值                 |
| ----------------------------- | ---- | ----------------------------------------------- | ----------------------------- |
| `COOKIE_PREFIX`               | 是   | 登录相关 Cookie 前缀                            | `geshu`                       |
| `BETTER_AUTH_SECRET`          | 是   | Better Auth 签名密钥                            | `your_better_auth_secret`     |
| `BETTER_AUTH_URL`             | 按需 | 服务端 Better Auth 基础地址                     | `https://example.com`         |
| `NEXT_PUBLIC_BETTER_AUTH_URL` | 按需 | 客户端 Better Auth 基础地址                     | `https://example.com`         |
| `NEXT_OUTPUT`                 | 否   | Next 构建输出模式                               | `standalone` / `export`       |
| `NEXT_TELEMETRY_DISABLED`     | 否   | 是否关闭 Next 遥测上报                          | `1`                           |
| `REDIS_URL`                   | 按需 | Redis 地址，仅在你手动接入 Redis 限流存储时使用 | `redis://127.0.0.1:6379`      |
| `DEFAULT_EMAIL_DOMAIN`        | 否   | 手机号注册时生成临时邮箱所使用的域名            | `example.com`                 |
| `IS_INTRANET`                 | 否   | 是否使用内网短信通道                            | `0`                           |
| `QJP_SMS_URL`                 | 按需 | 内网短信服务地址                                | `http://sms.example.com/send` |
| `ALIYUN_ACCESS_KEY_ID`        | 按需 | 阿里云短信 AccessKey ID                         | `your_access_key_id`          |
| `ALIYUN_ACCESS_KEY_SECRET`    | 按需 | 阿里云短信 AccessKey Secret                     | `your_access_key_secret`      |

### 推荐的本地 `.env` 示例

```env
COOKIE_PREFIX="geshu"
BETTER_AUTH_SECRET="your_better_auth_secret"

# Better Auth URL（按需）
BETTER_AUTH_URL=""

# 客户端可选（未配置时使用当前域名）
NEXT_PUBLIC_BETTER_AUTH_URL=""

# 构建与运行
NEXT_OUTPUT="standalone"
NEXT_TELEMETRY_DISABLED="1"

# 可选：仅在你启用 Redis 限流存储时使用
REDIS_URL="redis://127.0.0.1:6379"

# 临时邮箱域名
DEFAULT_EMAIL_DOMAIN="example.com"

# 短信配置
IS_INTRANET="0"
QJP_SMS_URL=""
ALIYUN_ACCESS_KEY_ID=""
ALIYUN_ACCESS_KEY_SECRET=""
```

### Better Auth URL 解析规则

服务端 `auth` 的 `baseURL` 解析顺序：

1. `BETTER_AUTH_URL`
2. 开发环境兜底 `http://localhost:3000`

客户端 `authClient` 的 `baseURL` 解析顺序：

1. 浏览器当前域名 `window.location.origin`
2. `NEXT_PUBLIC_BETTER_AUTH_URL`
3. 开发环境兜底 `http://localhost:3000`

## 系统设置

管理员登录后可以在“系统设置”页面维护运行时配置。配置保存在数据库中，保存后无需重启即可影响后续请求或调度。

系统设置不会读取同名环境变量。首次初始化时，缺失的配置项会写入代码默认值；之后以数据库中的值为准。

当前包含的设置：

- 基础设置：是否允许用户修改昵称、是否允许用户修改手机号
- 短信设置：是否在服务端系统日志中打印验证码，默认开启
- 限流设置：是否启用全局限流
- 自动备份：备份开关、备份频率、保留数量、日志保留时长、S3 / 兼容对象存储配置
- Nginx 设置：是否自动应用 Nginx 配置、执行 Nginx 时使用的命令

说明：

- 系统设置中的密钥类字段只在服务端使用，页面不会回显明文
- 密钥输入框留空保存表示保持原值不变，输入新值才会覆盖
- 开发环境下，“启用全局限流”和“自动应用 Nginx 配置”的默认值为关闭
- 关闭“自动应用 Nginx 配置”后，应用会立即尝试停止当前 Nginx 进程

## 代理服务

项目支持在后台创建内网反向代理和端口转发规则，并由应用写入 Nginx 配置、生成自签证书、执行 `nginx -t` 和 reload / quit。

能力范围：

- 支持域名、IPv4、IPv6 作为访问地址和目标地址
- IPv6 可填写 `fd00::1` 或 `[fd00::1]`，系统会统一保存为 `fd00::1`
- 支持自定义 `Location` 路径规则、`HTTP`、`HTTPS`、自签证书、`HTTP` 跳转 `HTTPS`、`WebSocket` 转发
- 反向代理开启 `HTTPS` 时，`HTTP` 端口可填写 `0` 表示不监听 `HTTP`
- 支持 `TCP` / `UDP` 端口转发，`SSL` 端口转发仅支持 `TCP`
- 不支持 `Let’s Encrypt`、证书上传、高级 Nginx 配置、访问列表、缓存和限速

### Nginx 运行语义

- 应用启动时会读取系统设置，对账 Nginx 当前应有的运行状态
- 当“自动应用 Nginx 配置”为开启时：
    - 应用会生成主配置与代理配置
    - 执行 `nginx -t`
    - 成功后启动或重载 Nginx
- 当“自动应用 Nginx 配置”为关闭时：
    - 应用会跳过代理服务自动生效
    - 并立即尝试停止当前 Nginx 进程

### Docker 说明

Docker 镜像会继续安装 Nginx，并暴露 `80`、`443`、`3000` 端口。

注意：

- 容器入口脚本只负责准备目录、默认主配置和执行 `prisma migrate deploy`
- 是否真正启动 Nginx，由应用在启动后根据“系统设置 / Nginx 设置”决定
- `NGINX_COMMAND` 已迁移到系统设置，不再通过环境变量控制

IPv6 外部访问还需要宿主机和 Docker 网络启用 IPv6。

## 自动备份

项目支持在应用启动时通过 `instrumentation.ts` 自动启动 SQLite 备份调度器。

适用前提：

- 当前部署为单实例或单主实例
- 应用进程是常驻运行，而不是短生命周期 `Serverless`
- 生产环境的 `/app/data` 已挂载为持久化目录

### 默认策略

- 每小时 1 份，保留 48 小时
- 每天 1 份，保留 30 天
- 每周 1 份，保留 12 周
- 每月 1 份，保留 12 个月
- `OperationLog` 和 `ErrorLog` 默认只保留 1 年内数据

### 系统设置

自动备份配置位于“系统设置 / 自动备份”。保存后会立即同步调度器状态：

- 开启时启动自动备份
- 关闭时停止自动备份
- 频率、保留策略和 S3 配置会在后续调度中生效

#### 备份频率与保留数量

每个层级都有两个配置：

- 备份周期：每隔多少个周期执行一次
- 保留数量：当前层级最多保留多少份本地备份

周期说明：

- 小时备份周期为 `2` 表示每 2 小时备份一次
- 每日备份周期为 `3` 表示每 3 天备份一次
- 每周备份周期为 `2` 表示每 2 周备份一次
- 每月备份周期为 `3` 表示每 3 个月备份一次

备份周期和保留数量都必须是正整数。

#### 日志保留时长

默认值为 `365d`。

支持格式：

- `30d`
- `52w`
- `24h`
- `90m`

无效时会回退到 `365d`。

#### S3 / 兼容对象存储

字段说明：

- `S3 地址`：对象存储地址
- `S3 区域`：区域
- `S3 存储桶`：桶名
- `S3 AccessKey ID`：访问密钥 ID
- `S3 AccessKey Secret`：访问密钥 Secret
- `S3 对象前缀`：可选，对象前缀
- `S3 Path Style`：可选，兼容部分 S3 网关

只要任一必填字段缺失或无效，则只做本地备份，不上传对象存储。

### 目录结构

自动备份会在 `data/backups` 下创建目录：

```text
data/backups/
├─ hourly/
├─ daily/
├─ weekly/
├─ monthly/
├─ manifests/
├─ tmp/
└─ state.json
```

### 工作方式

1. 应用启动时注册备份调度器
2. 调度器每分钟检查一次是否进入新的小时 / 日 / 周 / 月周期
3. 命中周期后使用 SQLite 热备份生成一致性快照
4. 备份成功后执行完整性校验
5. 然后按本地保留策略清理旧备份
6. 每天执行一次日志清理
7. 如果 S3 配置有效，再将备份压缩后上传到对象存储

### 注意事项

- 该方案适合单实例常驻进程
- 如果未来部署为多实例，建议补充分布式锁，避免重复备份
- 如果应用长时间停机，错过的周期不会逐个补跑，只会在恢复后补当前周期
- 恢复时建议优先从本地备份恢复，远端对象存储作为灾备副本

## Server Action 限流

项目内的 `server action` 限流能力已经内置在 `createResponseFn` 流程中。只要你的 action 是通过 `createResponseFn` 创建的，就会自动进入限流中间件。

核心入口：

- `server/createResponseFn.ts`
- `server/createRateLimit.ts`

### 快速使用

在 `shared` 函数上定义 `rateLimit` 属性即可，推荐使用 `createRateLimit` 获取完整类型提示：

```ts
import { createRateLimit } from "@/server/createRateLimit"

export async function login(params: LoginParams) {
    // ...
}

login.rateLimit = createRateLimit({
    limit: 5,
    windowMs: 60_000,
    message: "登录尝试过于频繁，请稍后再试",
})
```

### 默认行为

如果 `shared` 函数没有定义 `fn.rateLimit`，会使用全局默认配置：

- `limit`: `120`
- `windowMs`: `60_000`
- `prefix`: `"server-action"`
- `message`: `"操作过于频繁，请稍后再试"`

默认 key 规则：

`{prefix}:{action}:{userId 或 ip 或 anonymous}`

### 函数级配置

当你需要按账号、手机号等字段精细限流时，可以提供 `getKey`；如果某个函数不需要限流，也可以显式设为 `false` 或 `{ enabled: false }`。

### 全局开关

通过“系统设置 / 限流设置 / 启用全局限流”控制全局是否启用限流。

- 开发环境默认关闭
- 其他环境默认开启

你也可以在服务端代码中动态切换：

```ts
import { isGlobalRateLimitEnabled, setGlobalRateLimitEnabled } from "@/server/createRateLimit"

setGlobalRateLimitEnabled(false)

const enabled = await isGlobalRateLimitEnabled()
console.log(enabled)
```

### 全局策略配置

```ts
import { setGlobalRateLimitOptions } from "@/server/createRateLimit"

setGlobalRateLimitOptions({
    limit: 200,
    windowMs: 120_000,
    prefix: "my-action",
    message: "请求太频繁，请稍后重试",
})
```

### 存储解耦

限流逻辑与存储已解耦，当前支持：

- 内存存储（默认）
- 自建 Redis 存储（通过适配器接入）

#### 默认内存存储

无需额外配置，系统默认使用 `createMemoryRateLimitStore()`。

适用场景：

- 单实例部署
- 本地开发

#### 使用 Redis 存储

```ts
import { Redis } from "ioredis"

import { createRedisRateLimitStore, setGlobalRateLimitStore } from "@/server/createRateLimit"

const redis = new Redis(process.env.REDIS_URL!)

setGlobalRateLimitStore(
    createRedisRateLimitStore({
        async get(key) {
            return redis.get(key)
        },
        async set({ key, value, ttlMs }) {
            await redis.set(key, value, "PX", ttlMs)
        },
        async delete(key) {
            await redis.del(key)
        },
    }),
)
```
