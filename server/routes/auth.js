const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/** 최초 관리자 등록 화면 표시 여부 판단용 (인증 불필요) */
router.get('/has-admin', async (req, res) => {
  try {
    const count = await Admin.countDocuments();
    return res.json({ hasAdmin: count > 0 });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '확인에 실패했습니다.' });
  }
});

/**
 * JWT 서명 — JWT_SECRET이 없으면 jsonwebtoken이 예외를 던져 로그인이 500이 된다.
 * 왜: 원인을 로그·응답으로 바로 알 수 있게 사전 검사한다.
 */
function signToken(adminId) {
  const secret = process.env.JWT_SECRET;
  if (!secret || String(secret).trim() === '') {
    const e = new Error('JWT_SECRET_NOT_SET');
    e.code = 'JWT_SECRET_NOT_SET';
    throw e;
  }
  return jwt.sign({ sub: adminId }, secret, { expiresIn: '7d' });
}

function handleAuthError(res, err, fallbackMessage) {
  console.error(err);
  if (err && err.code === 'JWT_SECRET_NOT_SET') {
    return res.status(500).json({
      message:
        '서버 설정 오류: JWT_SECRET 환경 변수가 비어 있습니다. .env 또는 Vercel 환경 변수에 설정하세요.',
    });
  }
  return res.status(500).json({ message: fallbackMessage });
}

/** 관리자 가입 (가입 코드 필요) */
router.post('/register-first', async (req, res) => {
  try {
    const { email, password, name, registrationCode } = req.body;

    // 가입 코드 검증 (환경 변수에 설정된 코드와 대조)
    const secretCode = process.env.ADMIN_REGISTRATION_CODE;
    if (!secretCode || registrationCode !== secretCode) {
      return res.status(403).json({ message: '가입 코드가 올바르지 않거나 서버 설정이 미비합니다.' });
    }

    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호는 필수입니다.' });
    }

    // 이메일 중복 체크
    const existing = await Admin.findOne({ email: String(email).trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: '이미 가입된 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      email: String(email).trim().toLowerCase(),
      passwordHash,
      name: name || '관리자',
    });

    const token = signToken(admin._id.toString());
    return res.status(201).json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    return handleAuthError(res, err, '관리자 등록에 실패했습니다.');
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호를 입력하세요.' });
    }
    const admin = await Admin.findOne({ email: String(email).trim().toLowerCase() });
    if (!admin) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    const ok = await bcrypt.compare(password, admin.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }
    const token = signToken(admin._id.toString());
    return res.json({
      token,
      admin: { id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    return handleAuthError(res, err, '로그인 처리 중 오류가 발생했습니다.');
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const admin = await Admin.findById(req.adminId).lean();
    if (!admin) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }
    return res.json({
      admin: { id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '조회에 실패했습니다.' });
  }
});

/** 모든 관리자 목록 조회 (인증 필요) */
router.get('/', requireAuth, async (req, res) => {
  try {
    const admins = await Admin.find({}, { passwordHash: 0 }).sort({ createdAt: -1 }).lean();
    return res.json(admins);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '조회에 실패했습니다.' });
  }
});

/** 새로운 관리자 추가 (인증 필요) */
router.post('/register', requireAuth, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호는 필수입니다.' });
    }

    const existing = await Admin.findOne({ email: String(email).trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ message: '이미 사용 중인 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await Admin.create({
      email: String(email).trim().toLowerCase(),
      passwordHash,
      name: name || '관리자',
    });

    return res.status(201).json({
      admin: { id: admin._id, email: admin.email, name: admin.name },
    });
  } catch (err) {
    return handleAuthError(res, err, '관리자 등록에 실패했습니다.');
  }
});

/** 관리자 삭제 (인증 필요) */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // 본인 삭제 방지
    if (id === req.adminId) {
      return res.status(400).json({ message: '본인 계정은 삭제할 수 없습니다.' });
    }

    // 최소 1명의 관리자는 유지해야 하므로 확인
    const count = await Admin.countDocuments();
    if (count <= 1) {
      return res.status(400).json({ message: '최소 한 명의 관리자는 시스템에 존재해야 합니다.' });
    }

    const deleted = await Admin.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: '관리자를 찾을 수 없습니다.' });
    }

    return res.json({ message: '삭제되었습니다.' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: '삭제에 실패했습니다.' });
  }
});

module.exports = router;
