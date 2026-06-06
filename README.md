# GaokaoDocs 📚

高考志愿文档管理系统——基于 Vue3 + Express + SQLite FTS5 的 B/S 架构文档内容管理平台。支持 HTML/MD/PDF 在线预览、中文全文搜索、标签分类、访问统计和文件管理。

## 功能特性

- **多格式支持** — HTML 沙箱隔离渲染、Markdown 代码高亮渲染、PDF 逐页 Canvas 预览
- **中文全文搜索** — 基于 SQLite FTS5，支持中文分词搜索
- **标签管理** — 自定义标签分类，按标签筛选文件
- **访问统计** — 实时统计热门文件 Top10 和 30 日访问趋势
- **管理面板** — Web 界面文件上传/删除/重命名，JWT 认证保护
- **响应式布局** — 可折叠侧栏，桌面/移动端自适应

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Vue Router + marked + highlight.js + PDF.js |
| 后端 | Express + multer + jsonwebtoken + CORS |
| 搜索 | SQLite FTS5（Node.js 22 内置 `node:sqlite`） |
| 部署 | PM2 进程守护，端口 80 |

## 快速开始

### 环境要求

- Node.js >= 22（需要 `node:sqlite` 支持）
- npm >= 9

### 安装

```bash
# 克隆仓库
git clone git@github.com:betsyalan/GaokaoDocs.git
cd GaokaoDocs

# 安装后端依赖
npm install

# 安装前端依赖并构建
cd frontend && npm install && npm run build
cd ..
```

### 配置

```bash
# 设置管理员密码（必需）
export ADMIN_PASSWORD=your_secure_password

# 可选：设置 JWT 签名密钥（默认使用内置密钥）
export JWT_SECRET=your_jwt_secret
```

### 启动

```bash
# 开发模式（前后端分离）
node server/index.js           # 后端 :3000
cd frontend && npm run dev     # 前端 :5173（热更新）

# 生产模式（单进程）
ADMIN_PASSWORD=your_password node server/index.js

# 推荐：PM2 守护进程
npm install -g pm2
ADMIN_PASSWORD=your_password pm2 start ecosystem.config.cjs
pm2 save
```

### 启动脚本

```bash
./start.sh          # 构建前端 + PM2 启动
./start.sh restart  # 重启
./start.sh stop     # 停止
./start.sh logs     # 查看日志
```

## 项目结构

```
GaokaoDocs/
├── server/                      # 后端服务
│   ├── index.js                 # Express 入口
│   ├── routes/                  # API 路由
│   │   ├── files.js             # 文件列表/读取
│   │   ├── search.js            # 全文搜索
│   │   ├── tags.js              # 标签管理
│   │   ├── stats.js             # 访问统计
│   │   └── admin.js             # 管理操作
│   ├── services/
│   │   ├── fileReader.js        # 文件读取
│   │   └── searchIndex.js       # FTS5 索引
│   └── middleware/
│       └── stats.js             # 统计中间件
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── views/               # 页面组件
│   │   ├── components/          # 通用组件
│   │   ├── api/                 # API 封装
│   │   ├── router/              # 路由配置
│   │   └── styles/              # 全局样式
│   └── index.html
├── docs/                        # 文档内容源（自动扫描）
├── ecosystem.config.cjs         # PM2 配置
└── start.sh                     # 启动脚本
```

## API 接口

### 文件
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files?type=md` | 获取文件列表（可选按类型过滤） |
| GET | `/api/file/*` | 获取文件内容 |

### 搜索
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search?q=关键词` | 全文搜索 |
| POST | `/api/search/reindex` | 重建索引 |

### 标签
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tags` | 获取标签列表 |
| GET | `/api/tags?map=true` | 获取文件-标签映射 |
| POST | `/api/tags` | 设置文件标签 |

### 管理（需 JWT Token）
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/admin/login` | 管理员登录 |
| POST | `/api/admin/upload` | 上传文件 |
| DELETE | `/api/admin/delete` | 删除文件 |
| PUT | `/api/admin/rename` | 重命名文件 |

### 统计
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/stats` | 总览统计 |

## 安全说明

- 管理员密码通过环境变量 `ADMIN_PASSWORD` 传入，**不要硬编码在配置文件中**
- JWT 密钥通过环境变量 `JWT_SECRET` 传入
- 文件上传做了路径穿越防护和白名单校验
- HTML 渲染使用 iframe sandbox 隔离

## License

MIT
