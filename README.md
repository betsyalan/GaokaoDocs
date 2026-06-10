# GaokaoDocs 📚

高考志愿文档管理系统——基于 Vue3 + Express + SQLite 的 B/S 架构平台。集成文档内容管理和高考录取数据查询两大模块：

- **📄 文档管理** — HTML/MD/PDF 在线预览、中文全文搜索、标签分类、访问统计
- **📊 高考数据** — 内置 `gaokao_scores.db`（录取分数、一分一段表、大学信息），支持按省份-大学分级浏览历年录取分数线

## 功能特性

- **多格式支持** — HTML 沙箱隔离渲染、Markdown 代码高亮渲染、PDF 逐页 Canvas 预览
- **高考录取数据** — 收录各高校历年录取分数线，按省份-大学分级浏览，支持年份切换
- **一分一段表** — 省级高考分数段分布数据查询
- **中文全文搜索** — 基于 SQLite FTS5，支持中文分词搜索，覆盖文档和大学/专业名称
- **三套主题** — 琉璃蓝/琥珀橙/紫烟，CSS 变量驱动一键切换
- **标签管理** — 自定义标签分类，按标签筛选文件
- **访问统计** — 实时统计热门文件 Top10 和近 30 天访问折线图
- **管理面板** — Web 界面文件上传/删除/重命名，JWT 认证保护
- **响应式布局** — 可折叠侧栏，桌面/移动端自适应

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Vue 3 + Vite + Vue Router + marked + highlight.js + PDF.js + Lucide Icons |
| 后端 | Express + multer + jsonwebtoken + CORS |
| 数据 | SQLite FTS5 全文搜索 + `gaokao_scores.db` 录取分数据库 |
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
│   │   ├── admin.js             # 管理操作
│   │   ├── volunteer.js         # 志愿表数据
│   │   └── gaokao.js            # 高考录取数据 API
│   ├── services/
│   │   ├── fileReader.js        # 文件读取与分类
│   │   ├── searchIndex.js       # FTS5 全文索引
│   │   ├── volunteerData.js     # 志愿表数据服务
│   │   └── gaokaoData.js        # 高考录取数据查询
│   └── middleware/
│       └── stats.js             # 访问统计中间件
├── frontend/                    # 前端应用
│   ├── src/
│   │   ├── views/               # 页面组件
│   │   │   ├── Home.vue             # 首页（文档分类概览）
│   │   │   ├── DocumentView.vue     # 文档阅读
│   │   │   ├── Search.vue           # 全文搜索
│   │   │   ├── Stats.vue            # 访问统计
│   │   │   ├── AdminDashboard.vue   # 管理面板
│   │   │   ├── VolunteerPreview.vue # 志愿表预览
│   │   │   ├── GaokaoDistribution.vue    # 一分一段表
│   │   │   └── GaokaoAdmissionDetail.vue # 大学录取详情
│   │   ├── components/          # 通用组件
│   │   ├── api/                 # API 封装
│   │   ├── router/              # 路由配置
│   │   ├── composables/         # 组合式函数（主题切换等）
│   │   └── styles/              # 全局样式 + 三套主题变量
│   └── index.html
├── data/                        # 高考数据库（gitignored）
│   └── gaokao_scores.db         # SQLite 录取分数数据库
├── docs/                        # 文档内容源（自动扫描）
│   ├── metadata/                # 文件元数据/统计
│   └── search.db                # FTS5 搜索索引（自动生成）
├── ecosystem.config.cjs         # PM2 配置
└── start.sh                     # 启动脚本
```

## 高考录取数据

系统内置了广东省 2022-2025 年物理类高考录取数据，涵盖 19 所高校的录取分数线。

### 数据分类

所有数据通过侧栏分类和首页分类 Tab 访问，与文档文件并列展示：

| 分类 | 内容 |
|------|------|
| **历年录取分** | 各高校历年录取分数线，按所在地省份分组，支持按年份切换查看 |
| **一分一段表** | 广东省 2025 物理类分数段分布统计 |

### 数据来源

录取数据自动抓取自各高校招生官网。每条数据标注了来源 URL，页面顶部有免责声明提示仅供参考。

## API 接口

### 文件
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/files?type=md` | 获取文件列表（可选按类型过滤） |
| GET | `/api/file/*` | 获取文件内容 |

### 高考数据
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/gaokao/universities` | 大学列表（按省份分组，含标签信息） |
| GET | `/api/gaokao/admission/:code?year=2025` | 指定大学录取数据（可选年份） |
| GET | `/api/gaokao/distribution` | 一分一段表数据 |

### 搜索
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search?q=关键词&page=1&limit=20` | 全文搜索（支持翻页，覆盖文档和大学/专业名） |
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
| GET | `/api/stats` | 总览统计（含热门Top10和近30天趋势） |

### 志愿表
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/volunteer` | 获取志愿表数据 |

## 主题系统

三套 CSS 变量驱动的浅色主题，通过导航栏下拉菜单一键切换：

- **琉璃蓝 · 现代简约** — 清爽蓝色系
- **琥珀橙 · 温暖现代** — 温暖橙色系
- **紫烟 · 优雅现代** — 淡紫色系

## 安全说明

- 管理员密码通过环境变量 `ADMIN_PASSWORD` 传入，**不要硬编码在配置文件中**
- JWT 密钥通过环境变量 `JWT_SECRET` 传入
- 文件上传做了路径穿越防护和白名单校验
- HTML 渲染使用 iframe sandbox 隔离

## License

MIT
