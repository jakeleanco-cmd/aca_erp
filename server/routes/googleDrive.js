const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { listFiles, deleteFile, getStorageQuota, FOLDER_TYPES } = require('../services/googleDriveService');
const { migrateDriveFiles } = require('../services/googleDriveMigrationService');

const router = express.Router();

// 인증 필수
router.use(requireAuth);

/**
 * 구글 드라이브 파일 목록 조회 (폴더 필터 지원)
 */
router.get('/files', async (req, res) => {
  try {
    const { query, pageToken, pageSize, folderType } = req.query;
    const data = await listFiles({
      query: query || '',
      pageToken: pageToken || null,
      pageSize: pageSize ? Number(pageSize) : 30,
      folderType: folderType || null,
    });
    res.json(data);
  } catch (error) {
    console.error('[Google Drive Route] 파일 목록 조회 실패:', error.message);
    res.status(500).json({ 
      message: '구글 드라이브 파일 목록을 불러오지 못했습니다.', 
      error: error.message 
    });
  }
});

/**
 * 기존 파일 용도별 폴더 마이그레이션 실행 API
 */
router.post('/migrate-folders', async (req, res) => {
  try {
    const { dryRun = false } = req.body;
    const result = await migrateDriveFiles({ dryRun });
    res.json({ ok: true, result });
  } catch (error) {
    console.error('[Google Drive Route] 폴더 마이그레이션 실패:', error.message);
    res.status(500).json({ 
      message: '폴더 마이그레이션에 실패했습니다.', 
      error: error.message 
    });
  }
});

/**
 * 구글 드라이브 스토리지 용량 정보 조회
 */
router.get('/quota', async (req, res) => {
  try {
    const quotaData = await getStorageQuota();
    res.json(quotaData || {});
  } catch (error) {
    console.error('[Google Drive Route] 용량 정보 조회 실패:', error.message);
    res.status(500).json({ 
      message: '구글 드라이브 용량 정보를 불러오지 못했습니다.', 
      error: error.message 
    });
  }
});

/**
 * 단일 파일 삭제
 */
router.delete('/files/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    await deleteFile(fileId);
    res.json({ ok: true, message: '파일이 삭제되었습니다.' });
  } catch (error) {
    console.error('[Google Drive Route] 파일 삭제 실패:', error.message);
    res.status(500).json({ 
      message: '파일 삭제에 실패했습니다.', 
      error: error.message 
    });
  }
});

/**
 * 다중 파일 일괄 삭제
 */
router.post('/files/batch-delete', async (req, res) => {
  try {
    const { fileIds } = req.body;
    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ message: '삭제할 파일 목록이 없습니다.' });
    }

    const results = [];
    for (const id of fileIds) {
      try {
        await deleteFile(id);
        results.push({ id, status: 'success' });
      } catch (err) {
        results.push({ id, status: 'failed', error: err.message });
      }
    }

    res.json({ ok: true, count: results.filter(r => r.status === 'success').length, results });
  } catch (error) {
    console.error('[Google Drive Route] 일괄 삭제 실패:', error.message);
    res.status(500).json({ 
      message: '파일 일괄 삭제에 실패했습니다.', 
      error: error.message 
    });
  }
});

module.exports = router;
