/**
 * 高考录取数据查询服务
 * 封装对 gaokao_scores.db 的查询
 */
import { DatabaseSync } from 'node:sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.resolve(__dirname, '../../data/gaokao_scores.db')

let db = null

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH)
  }
  return db
}

/**
 * 获取大学列表，按所在地省份分组
 * 返回: { provinces: [{ province, universities: [{ code, name, city, tags }] }] }
 */
export function getUniversities() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT u.university_code AS code,
           u.university_name AS name,
           u.province,
           u.city,
           u.is_ministry_affiliated,
           u.is_985,
           u.is_211,
           u.is_double_first_class
    FROM universities_info u
    WHERE u.university_code IN (
      SELECT DISTINCT university_code FROM university_admission_data
    )
    ORDER BY u.province, u.university_name
  `).all()

  // 按省份分组
  const provinceMap = {}
  for (const r of rows) {
    if (!provinceMap[r.province]) {
      provinceMap[r.province] = { province: r.province, universities: [] }
    }
    const tags = []
    if (r.is_ministry_affiliated) tags.push('部属')
    if (r.is_985) tags.push('985')
    if (r.is_211) tags.push('211')
    if (r.is_double_first_class) tags.push('双一流')
    provinceMap[r.province].universities.push({
      code: r.code,
      name: r.name,
      city: r.city || '',
      tags
    })
  }

  return {
    provinces: Object.values(provinceMap)
  }
}

/**
 * 获取指定大学的录取数据，按年份和专业组分组
 * @param {string} universityCode - 大学代码
 * @param {number} [year] - 可选，指定年份，默认最新年份
 * 返回: { university: {...}, years: [2025,2024,...], activeYear: 2025,
 *        groups: [{ groupName, majors: [...] }] }
 */
export function getAdmissionByCode(universityCode, year) {
  const db = getDb()

  // 获取大学基本信息
  const uniInfo = db.prepare(`
    SELECT university_name, province, city,
           is_ministry_affiliated, is_985, is_211, is_double_first_class
    FROM universities_info
    WHERE university_code = ?
  `).get(universityCode)

  if (!uniInfo) return null

  // 获取该大学所有可用年份
  const availableYears = db.prepare(`
    SELECT DISTINCT year FROM university_admission_data
    WHERE university_code = ? ORDER BY year DESC
  `).all(universityCode).map(r => r.year)

  if (availableYears.length === 0) return null

  // 默认取最新年份
  const activeYear = year || availableYears[0]

  // 获取指定年份的录取数据
  const rows = db.prepare(`
    SELECT year, province, subject_type, admission_type,
           subject_group_name, major_name, enrollment_count,
           max_score, min_score, avg_score, min_rank
    FROM university_admission_data
    WHERE university_code = ? AND year = ?
    ORDER BY subject_group_name, major_name
  `).all(universityCode, activeYear)

  // 按专业组分组
  const groups = []
  const groupMap = {}

  for (const r of rows) {
    const key = r.subject_group_name || '其他'
    if (!groupMap[key]) {
      groupMap[key] = {
        groupName: key,
        admissionType: r.admission_type || '',
        majors: []
      }
      groups.push(groupMap[key])
    }
    groupMap[key].majors.push({
      majorName: r.major_name || '',
      enrollmentCount: r.enrollment_count,
      maxScore: r.max_score,
      minScore: r.min_score,
      avgScore: r.avg_score,
      minRank: r.min_rank
    })
  }

  const tags = []
  if (uniInfo.is_ministry_affiliated) tags.push('部属')
  if (uniInfo.is_985) tags.push('985')
  if (uniInfo.is_211) tags.push('211')
  if (uniInfo.is_double_first_class) tags.push('双一流')

  return {
    university: {
      name: uniInfo.university_name,
      code: universityCode,
      province: uniInfo.province,
      city: uniInfo.city || '',
      tags
    },
    years: availableYears,
    activeYear,
    admissionProvince: rows.length > 0 ? rows[0].province : null,
    subjectType: rows.length > 0 ? rows[0].subject_type : null,
    groups
  }
}

/**
 * 获取一分一段表数据
 * 返回: { rows: [{ score, bachelorCount, bachelorCumulative, associateCount, associateCumulative }],
 *        meta: { province, year, subjectType } }
 */
export function getDistribution() {
  const db = getDb()
  const rows = db.prepare(`
    SELECT score, bachelor_count, bachelor_cumulative,
           associate_count, associate_cumulative
    FROM province_score_distribution
    ORDER BY score DESC
  `).all()

  // 获取元信息
  const meta = db.prepare(`
    SELECT province, year, subject_type
    FROM province_score_distribution
    LIMIT 1
  `).get()

  return {
    rows: rows.map(r => ({
      score: r.score,
      bachelorCount: r.bachelor_count,
      bachelorCumulative: r.bachelor_cumulative,
      associateCount: r.associate_count,
      associateCumulative: r.associate_cumulative
    })),
    meta: meta ? { province: meta.province, year: meta.year, subjectType: meta.subject_type } : null
  }
}
