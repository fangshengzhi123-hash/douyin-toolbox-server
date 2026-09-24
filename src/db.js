/**
 * 数据库访问层
 * - 读取 Render 环境变量 DATABASE_URL 连接 PostgreSQL
 * - 启动时自动检测并创建客户信息表
 */
const { Pool } = require('pg');

/** 本地开发时可通过 .env 手动注入 DATABASE_URL；Render 上由平台自动提供 */
const DATABASE_URL =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/douyin_toolbox';

/**
 * Render 免费 Postgres 提供的是外部连接串；内部连接串环境变量为 DATABASE_URL_INTERNAL。
 * 优先使用 INTERNAL（同区域内网、免 SSL 校验），否则回退 DATABASE_URL 并开启 SSL。
 */
const internalUrl = process.env.DATABASE_URL_INTERNAL;
const pool = new Pool({
  connectionString: internalUrl || DATABASE_URL,
  ssl: internalUrl ? false : { rejectUnauthorized: false },
  max: 5, // 免费额度连接数有限，收紧连接池
});

/** 客户表字段与前端客户管理表格一一对应 */
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS customers (
  id             TEXT PRIMARY KEY,
  customer_name  TEXT NOT NULL,
  contact_person TEXT DEFAULT '',
  phone          TEXT DEFAULT '',
  project        TEXT DEFAULT '',
  manager        TEXT DEFAULT '',
  copywriting    TEXT DEFAULT '',
  clip           TEXT DEFAULT '',
  remark         TEXT DEFAULT '',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_name  ON customers (customer_name);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers (phone);
`;

/** 启动时自动建表（幂等） */
async function initDb() {
  await pool.query(CREATE_TABLE_SQL);
  console.log('[db] customers 表已就绪');
}

/**
 * 查询客户列表（支持关键字模糊搜索 + 分页）
 * @param {string} keyword 按 客户名/联系人/手机号 模糊匹配，可为空
 * @param {number} page 页码，从 1 开始
 * @param {number} pageSize 每页条数
 */
async function listCustomers(keyword, page, pageSize) {
  const params = [];
  let whereSql = '';
  if (keyword) {
    whereSql = `WHERE customer_name ILIKE $1 OR contact_person ILIKE $1 OR phone ILIKE $1`;
    params.push(`%${keyword}%`);
  }

  const countRes = await pool.query(
    `SELECT COUNT(*)::int AS total FROM customers ${whereSql}`,
    params
  );
  const total = countRes.rows[0].total;

  const offset = (page - 1) * pageSize;
  const rowsRes = await pool.query(
    `SELECT * FROM customers ${whereSql}
     ORDER BY created_at DESC
     LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, pageSize, offset]
  );

  return { total, list: rowsRes.rows.map(mapRow) };
}

/** 全量查询（导出 Excel 用，忽略分页） */
async function allCustomers(keyword) {
  const params = [];
  let whereSql = '';
  if (keyword) {
    whereSql = `WHERE customer_name ILIKE $1 OR contact_person ILIKE $1 OR phone ILIKE $1`;
    params.push(`%${keyword}%`);
  }
  const res = await pool.query(
    `SELECT * FROM customers ${whereSql} ORDER BY created_at DESC`,
    params
  );
  return res.rows.map(mapRow);
}

/** 新增客户，返回映射后的记录 */
async function insertCustomer(c) {
  const id = `cus_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const res = await pool.query(
    `INSERT INTO customers
       (id, customer_name, contact_person, phone, project, manager, copywriting, clip, remark)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
     RETURNING *`,
    [
      id,
      c.customerName,
      c.contactPerson || '',
      c.phone || '',
      c.project || '',
      c.manager || '',
      c.copywriting || '',
      c.clip || '',
      c.remark || '',
    ]
  );
  return mapRow(res.rows[0]);
}

/** 按 id 更新客户 */
async function updateCustomer(c) {
  const res = await pool.query(
    `UPDATE customers SET
       customer_name=$2, contact_person=$3, phone=$4, project=$5,
       manager=$6, copywriting=$7, clip=$8, remark=$9, updated_at=now()
     WHERE id=$1 RETURNING *`,
    [
      c.id,
      c.customerName,
      c.contactPerson || '',
      c.phone || '',
      c.project || '',
      c.manager || '',
      c.copywriting || '',
      c.clip || '',
      c.remark || '',
    ]
  );
  return res.rowCount ? mapRow(res.rows[0]) : null;
}

/** 按 id 删除客户 */
async function deleteCustomer(id) {
  const res = await pool.query(`DELETE FROM customers WHERE id=$1`, [id]);
  return res.rowCount > 0;
}

/** 数据库 snake_case 行 → 前端 camelCase 结构 */
function mapRow(row) {
  return {
    id: row.id,
    customerName: row.customer_name,
    contactPerson: row.contact_person,
    phone: row.phone,
    project: row.project,
    manager: row.manager,
    copywriting: row.copywriting,
    clip: row.clip,
    remark: row.remark,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

module.exports = { initDb, listCustomers, allCustomers, insertCustomer, updateCustomer, deleteCustomer };
