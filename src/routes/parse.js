/**
 * 抖音解析接口（占位实现）
 *
 * ⚠️ 重要：本文件内的抖音私有接口调用为占位函数。
 * a_bogus / x-bogus 签名加密算法【未实现】，需要人工后续补充，
 * 且抖音私有接口会不定期变动，需定期回归验证。
 */
const express = require('express');

const router = express.Router();

/**
 * TODO(人工补全): 实现抖音 a_bogus / x-bogus 签名算法。
 * 参考思路（仅供人工实现时查阅，本仓库不内置任何签名逻辑）：
 *   1. 从分享链接中解析出视频 id（如 https://v.douyin.com/xxxx/ 重定向后的 modal_id / aweme_id）。
 *   2. 构造抖音 web 私有接口请求参数（common 参数 + verifyFp + msToken 等）。
 *   3. 使用用户配置的 Cookie 计算 a_bogus 签名并拼接到 query。
 *   4. 请求 https://www.iesdouyin.com/share/video/{aweme_id}/ 或
 *      https://www.douyin.com/aweme/v1/web/aweme/detail/ 获取 JSON。
 *   5. 从响应中提取无水印 playAddr、音乐、封面、图集（images）等。
 * 注意：签名算法与接口结构随抖音版本变化，需人工维护。
 *
 * @param {string} shareUrl 抖音分享链接
 * @param {string} cookie 用户配置的抖音 web Cookie
 * @returns {Promise<object|null>} 解析结果元数据；占位期返回 null
 */
async function callDouyinPrivateApi(shareUrl, cookie) {
  // TODO: 人工实现 a_bogus/x-bogus 签名后，在此处调用抖音私有接口
  void shareUrl;
  void cookie;
  return null;
}

/** 从分享文本/链接中提取真实抖音 URL */
function extractShareUrl(text) {
  const match = String(text || '').match(/https?:\/\/[^\s"'，。]+/);
  return match ? match[0] : '';
}

/**
 * POST /api/parse-douyin
 * 请求体: { "share_url": "抖音分享链接", "cookie": "抖音web cookie" }
 * 成功:   { code: 0, data: { title, video_url, audio_url, cover_url, is_collection, images } }
 * 失败:   { code: 非0, msg: "错误描述" }
 */
router.post('/parse-douyin', async (req, res, next) => {
  try {
    const { share_url: shareUrl, cookie } = req.body || {};
    if (!extractShareUrl(shareUrl)) {
      return res.json({ code: 1001, msg: '分享链接无效，请粘贴完整的抖音分享链接' });
    }
    if (!cookie) {
      return res.json({ code: 1002, msg: '缺少抖音 Cookie，请在设置页填写' });
    }

    const parsed = await callDouyinPrivateApi(shareUrl, cookie);
    if (!parsed) {
      // 占位期统一返回此错误，提示签名算法待人工补全
      return res.json({
        code: 1003,
        msg: '抖音解析接口为占位实现：a_bogus/x-bogus 签名算法待人工补全（见 server/src/routes/parse.js TODO）',
      });
    }

    res.json({ code: 0, data: parsed });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
