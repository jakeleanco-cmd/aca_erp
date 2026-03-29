const jwt = require('jsonwebtoken');

/**
 * JWT를 검증하고 req.adminId에 관리자 ID를 넣는다.
 * 왜: 모든 보호 API에서 동일한 인증 규칙을 재사용하기 위함.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ message: '로그인이 필요합니다.' });
  }
  const token = header.slice(7);
  try {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET 미설정');
    }
    const payload = jwt.verify(token, secret);
    req.adminId = payload.sub;
    return next();
  } catch (err) {
    return res.status(401).json({ message: '토큰이 유효하지 않습니다.' });
  }
}

module.exports = { requireAuth };
