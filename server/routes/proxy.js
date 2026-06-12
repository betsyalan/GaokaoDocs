import { Router } from 'express'
import { isValidProxyUrl, fetchProxyPage } from '../services/pageProxy.js'

const router = Router()

// GET /api/proxyPage?url=https://zs.szu.edu.cn/info/1153/2985.htm
// 返回外部页面的 HTML，由前端 iframe 加载（同源，不会被 X-Frame-Options 拦截）
router.get('/proxyPage', async (req, res) => {
  const { url } = req.query

  if (!url || !isValidProxyUrl(url)) {
    return res.status(400).send('无效的代理地址，仅支持 .edu.cn 和 .gov.cn 域名')
  }

  try {
    const html = await fetchProxyPage(url)
    res.set('Content-Type', 'text/html; charset=utf-8')
    res.send(html)
  } catch (err) {
    console.error('[Proxy]', err.message)
    res.status(502).send(`代理加载失败: ${err.message}`)
  }
})

export default router
