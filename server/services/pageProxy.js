/**
 * 外部页面代理服务
 * 通过服务器端 fetch 获取目标页面完整 HTML，注入 <base> 标签和少量样式调整
 */
import path from 'path'

// 允许代理的域名白名单（只允许教育/政府类网站）
const ALLOWED_HOSTS = /\.edu\.cn$|\.gov\.cn$/

/**
 * 校验 URL 是否允许代理
 */
export function isValidProxyUrl(url) {
  try {
    const parsed = new URL(url)
    return ALLOWED_HOSTS.test(parsed.hostname) &&
           (parsed.protocol === 'http:' || parsed.protocol === 'https:')
  } catch {
    return false
  }
}

/**
 * 获取完整页面并调整布局样式
 * 1. fetch 获取页面
 * 2. 注入 <base> 标签使相对路径解析到原始站
 * 3. 注入少量 CSS 让内容区域展开更宽
 */
export async function fetchProxyPage(url) {
  if (!isValidProxyUrl(url)) {
    throw new Error('不允许代理该地址，仅支持 .edu.cn 和 .gov.cn 域名')
  }

  const parsed = new URL(url)
  const pageDir = path.dirname(parsed.href) + '/'

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    },
    signal: AbortSignal.timeout(15000)
  })

  if (!response.ok) {
    throw new Error(`代理请求失败: HTTP ${response.status}`)
  }

  let html = await response.text()

  // 注入 <base> 标签
  html = html.replace('<head>', `<head><base href="${pageDir}">`)

  // 注入展开样式：让内容区域更宽，去除左右空白和白框限制
  html = html.replace('</head>', `
  <style>
    /* 展开内容区域，去除窄框限制 */
    .ny-main, .container, .wrapper, .main, #content, .content,
    [class*="container"], [class*="wrapper"], [class*="main"],
    .con-bd, .v_news_content, .list, .news-content, .article-content,
    .ny_right, .right-content, .main-content {
      max-width: none !important;
      width: auto !important;
      margin-left: 0 !important;
      margin-right: 0 !important;
      padding-left: 20px !important;
      padding-right: 20px !important;
      float: none !important;
    }
    /* 让表格占满宽度 */
    table {
      width: 100% !important;
      max-width: 100% !important;
    }
    /* 隐藏不必要的侧栏和空白 */
    [class*="sidebar"], [class*="left"], [class*="right-nav"],
    [class*="side"], [class*="aside"], [class*="extra"],
    [class*="advert"], [class*="ad-"], [class*="float"] {
      display: none !important;
    }
    body { min-width: auto !important; }
  </style>
  </head>`)

  return html
}
