/**
 * 客户管理接口
 * 所有数据读写 Render PostgreSQL，前端本地不持久化任何客户数据。
 */
const express = require('express');
const ExcelJS = require('exceljs');
const db = require('../db');

const router = express.Router();

/** 校验客户表单：客户名必填；手机号如填写需符合中国大陆号码格式 */
function validateCustomer(body, { partial = false } = {}) {
  const errors = [];
  if (!partial || body.customerName !== undefined) {
    if (!body.customerName || !String(body.customerName).trim()) {
      errors.push('客户名不能为空');
    }
  }
  if (body.phone && !/^1[3-9]\d{9}$/.test(String(body.phone).trim())) {
    errors.push('手机号格式不正确');
  }
  return errors;
}

/**
 * GET /api/customer-list?keyword=&page=1&pageSize=10
 * 分页 + 按 客户名/联系人/手机号 模糊搜索（搜索在后端数据库执行）
 */
router.get('/customer-list', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize, 10) || 10));
    const { total, list } = await db.listCustomers(keyword, page, pageSize);
    res.json({ code: 0, data: { total, page, pageSize, list } });
  } catch (err) {
    next(err);
  }
});

/** POST /api/customer-add 新增客户 */
router.post('/customer-add', async (req, res, next) => {
  try {
    const errors = validateCustomer(req.body || {});
    if (errors.length) {
      return res.json({ code: 1, msg: errors.join('；') });
    }
    const record = await db.insertCustomer(req.body);
    res.json({ code: 0, data: record });
  } catch (err) {
    next(err);
  }
});

/** PUT /api/customer-update 更新客户（需带 id） */
router.put('/customer-update', async (req, res, next) => {
  try {
    const body = req.body || {};
    if (!body.id) {
      return res.json({ code: 1, msg: '缺少客户 id' });
    }
    const errors = validateCustomer(body);
    if (errors.length) {
      return res.json({ code: 1, msg: errors.join('；') });
    }
    const record = await db.updateCustomer(body);
    if (!record) {
      return res.json({ code: 1, msg: '客户记录不存在' });
    }
    res.json({ code: 0, data: record });
  } catch (err) {
    next(err);
  }
});

/** DELETE /api/customer-remove?id=xxx 删除客户 */
router.delete('/customer-remove', async (req, res, next) => {
  try {
    const id = String(req.query.id || '').trim();
    if (!id) {
      return res.json({ code: 1, msg: '缺少参数 id' });
    }
    const ok = await db.deleteCustomer(id);
    if (!ok) {
      return res.json({ code: 1, msg: '客户记录不存在' });
    }
    res.json({ code: 0, data: null });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/customer-export?keyword=
 * 从 PostgreSQL 读取数据，生成 Excel（xlsx）文件流返回。
 */
router.get('/customer-export', async (req, res, next) => {
  try {
    const keyword = String(req.query.keyword || '').trim();
    const rows = await db.allCustomers(keyword);

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('客户列表');
    sheet.columns = [
      { header: '客户名', key: 'customerName', width: 20 },
      { header: '联系人', key: 'contactPerson', width: 15 },
      { header: '手机号', key: 'phone', width: 16 },
      { header: '合作项目', key: 'project', width: 22 },
      { header: '负责人', key: 'manager', width: 12 },
      { header: '文案撰写', key: 'copywriting', width: 12 },
      { header: '视频剪辑', key: 'clip', width: 12 },
      { header: '备注', key: 'remark', width: 30 },
    ];
    sheet.getRow(1).font = { bold: true };
    rows.forEach((r) => sheet.addRow(r));

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="customers-${Date.now()}.xlsx"`
    );
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    next(err);
  }
});

module.exports = router;
