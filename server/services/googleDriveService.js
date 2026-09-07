const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

/**
 * 구글 드라이브 서비스 (OAuth2 방식)
 * - OAuth2 Refresh Token을 사용하여 구글 드라이브에 인증합니다.
 */

// OAuth2 토큰 만료 상태를 메모리에 캐싱하여 반복적인 실패 요청 방지
let isOAuthTokenExpired = false;

/**
 * OAuth2 Refresh Token 기반의 드라이브 컨텍스트 생성
 */
const getOAuth2Context = (folderId) => {
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) return null;

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  return {
    drive: google.drive({ version: 'v3', auth: oauth2Client }),
    folderId,
    authType: 'OAuth2',
  };
};

/**
 * 토큰 만료 에러(invalid_grant 등) 여부 판단
 */
const isTokenExpiredError = (error) => {
  const message = error?.message || '';
  const errorDesc = error?.response?.data?.error_description || '';
  const errorCode = error?.response?.data?.error || '';
  return (
    errorCode === 'invalid_grant' ||
    message.includes('invalid_grant') ||
    errorDesc.includes('Token has been expired') ||
    errorDesc.includes('revoked')
  );
};

/**
 * 드라이브 API 호출 공통 실행 함수 (OAuth2 전용)
 */
const runWithDrive = async (operation) => {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID 환경 변수가 설정되지 않았습니다.');
  }

  const oauthContext = getOAuth2Context(folderId);
  if (!oauthContext) {
    throw new Error('사용 가능한 구글 드라이브 인증 정보(OAuth2)가 없습니다. REFRESH_TOKEN 등을 확인해주세요.');
  }

  try {
    return await operation(oauthContext.drive, oauthContext.folderId, 'OAuth2');
  } catch (err) {
    if (isTokenExpiredError(err)) {
      console.warn('[Google Drive] OAuth2 Refresh Token 만료 감지 (invalid_grant). 다시 발급 받아야 합니다.');
      throw new Error('Google Drive 토큰이 만료되었습니다. 다시 로그인하여 갱신해 주세요.');
    } else if (err?.response?.data?.error?.errors?.[0]?.reason === 'storageQuotaExceeded') {
      console.warn('[Google Drive] 저장소 한도 초과 오류 감지.');
    }
    throw err;
  }
};

// 용도별 표준 폴더명 상수 정의
const FOLDER_TYPES = {
  EXAM_PAPER: '기출시험지',
  EXAM_SHEET: '답안지',
  FORMATIVE_EXAM: '형성평가',
  OTHER: '기타',
};

// 폴더 ID 인메모리 캐시 (불필요한 API 호출 방지)
const folderIdCache = new Map();

/**
 * 루트 폴더 하위에서 특정 이름의 폴더를 조회하고, 없으면 새로 생성
 */
async function getOrCreateSubfolder(drive, rootFolderId, folderName) {
  if (!folderName) return rootFolderId;
  
  const cacheKey = `${rootFolderId}:${folderName}`;
  if (folderIdCache.has(cacheKey)) {
    return folderIdCache.get(cacheKey);
  }

  // 1. 기존 폴더 검색 (루트 하위의 폴더 타입 파일)
  const escapedName = folderName.replace(/'/g, "\\'");
  const q = `'${rootFolderId}' in parents and name = '${escapedName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  
  const listRes = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 1,
  });

  if (listRes.data.files && listRes.data.files.length > 0) {
    const existingId = listRes.data.files[0].id;
    folderIdCache.set(cacheKey, existingId);
    return existingId;
  }

  // 2. 없으면 새로 생성
  console.log(`[Google Drive] 하위 폴더 생성: ${folderName} (상위: ${rootFolderId})`);
  const createRes = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [rootFolderId],
    },
    fields: 'id, name',
  });

  const newFolderId = createRes.data.id;

  // 폴더 링크 열람 권한 부여 (공유 드라이브/링크 공유 대비)
  try {
    await drive.permissions.create({
      fileId: newFolderId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });
  } catch (permError) {
    console.warn(`[Google Drive] 폴더(${folderName}) 권한 설정 경고:`, permError.message);
  }

  folderIdCache.set(cacheKey, newFolderId);
  return newFolderId;
}

/**
 * 구글 드라이브로 파일 업로드
 * @param {Object} file 멀터 파일 객체
 * @param {Object} options { folderType: string } (옵션 없을 시 기본 루트 폴더에 저장)
 */
async function uploadFile(file, options = {}) {
  const { folderType = null } = options;

  return await runWithDrive(async (drive, rootFolderId) => {
    // 용도별 폴더 지정 시 해당 하위 폴더 ID 획득, 미지정 시 루트 폴더 사용
    let targetFolderId = rootFolderId;
    if (folderType) {
      targetFolderId = await getOrCreateSubfolder(drive, rootFolderId, folderType);
    }
    // 한글 파일명 깨짐 방지: 
    // 1. 브라우저에서 업로드된 경우(Multer) latin1 -> utf8 변환이 필요할 수 있음
    // 2. 모든 경우에 대해 macOS NFD(자음/모음 분리) 현상을 방지하기 위해 NFC 정규화 수행
    let name = file.originalname;
    if (!file.skipDecoding) {
      try {
        // 모든 문자가 0~255 사이(latin1 영역)인지 검사하여
        // 멀터(Multer)가 UTF-8을 한 글자씩 latin1으로 잘못 읽었을 때만 복구 시도
        const isLatin1 = Array.from(name).every(c => c.charCodeAt(0) <= 255);
        if (isLatin1) {
          const latin1Buffer = Buffer.from(name, 'latin1');
          const utf8String = latin1Buffer.toString('utf8');
          
          // 변환된 문자열에 깨짐(Replacement Character)이 없으면 적용
          if (!utf8String.includes('\uFFFD') && utf8String !== name) {
            name = utf8String;
          }
        }
      } catch (e) {
        console.warn('[Google Drive] 파일명 디코딩 중 에러 (원본 사용):', e.message);
      }
    }
    const decodedName = name.normalize('NFC');
    
    console.log(`[Google Drive] 파일명 정규화 및 인코딩: ${file.originalname} -> ${decodedName}`);
    console.log(`[Google Drive] 업로드 시작: ${decodedName}`);

    const response = await drive.files.create({
        requestBody: {
          name: decodedName,
          parents: [targetFolderId],
          // 공유 드라이브(Shared Drive) 사용 시 필요한 옵션
          // GOOGLE_SHARED_DRIVE_ID 환경 변수에 ID를 지정하면 해당 드라이브에 업로드합니다.
        },
        media: {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path),
        },
        // 공유 드라이브 지원 옵션
        supportsAllDrives: true,
        // driveId 가 설정돼 있으면 해당 공유 드라이브에 저장합니다.
        ...(process.env.GOOGLE_SHARED_DRIVE_ID && { driveId: process.env.GOOGLE_SHARED_DRIVE_ID }),
        fields: 'id, name, webViewLink, webContentLink',
      
    });

    console.log(`[Google Drive] 업로드 성공: ${response.data.id} (폴더: ${folderType || '루트'})`);

    // 권한 설정 (누구나 링크로 열람 가능하도록)
    try {
      await drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError) {
      console.warn('[Google Drive] 권한 설정 중 경고 (무시 가능):', permError.message);
    }

    return response.data;
  });
}

/**
 * 구글 드라이브에서 파일 삭제
 */
async function deleteFile(fileId) {
  if (!fileId) return;
  try {
    await runWithDrive(async (drive) => {
      console.log(`[Google Drive] 파일 삭제 중: ${fileId}`);
      await drive.files.delete({ fileId });
    });
  } catch (error) {
    console.warn('[Google Drive] 삭제 중 경고:', error.message);
  }
}

/**
 * 구글 드라이브 내 파일 이동 (부모 폴더 변경)
 * 파일 ID와 webViewLink는 유지되며 폴더 위치만 이동됩니다.
 */
async function moveFile(fileId, targetFolderId, fromFolderId) {
  if (!fileId || !targetFolderId) {
    throw new Error('fileId와 targetFolderId가 필요합니다.');
  }

  return await runWithDrive(async (drive, rootFolderId) => {
    const sourceFolder = fromFolderId || rootFolderId;
    console.log(`[Google Drive] 파일 이동: ${fileId} (${sourceFolder} -> ${targetFolderId})`);
    
    const response = await drive.files.update({
      fileId,
      addParents: targetFolderId,
      removeParents: sourceFolder,
      fields: 'id, parents',
    });
    return response.data;
  });
}

/**
 * 업로드 후 로컬 임시 파일 삭제까지 수행하는 헬퍼 함수
 */
async function uploadWithCleanup(file, options = {}) {
  if (!file || !file.path) {
    throw new Error('전송된 파일 정보가 올바르지 않습니다.');
  }

  try {
    const driveInfo = await uploadFile(file, options);
    return driveInfo;
  } finally {
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log(`[Google Drive] 로컬 임시 파일 삭제 완료: ${file.path}`);
      } catch (err) {
        console.error('[Google Drive] 임시 파일 보관 실패:', err.message);
      }
    }
  }
}

/**
 * 구글 드라이브 하위 폴더 목록 조회 (폴더명 -> 폴더 ID 매핑 맵 반환)
 */
async function getSubfolderMap(drive, rootFolderId) {
  const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  const res = await drive.files.list({
    q,
    fields: 'files(id, name)',
    pageSize: 50,
  });
  const map = new Map();
  (res.data.files || []).forEach(f => {
    map.set(f.id, f.name);
    folderIdCache.set(`${rootFolderId}:${f.name}`, f.id);
  });
  return map;
}

/**
 * 구글 드라이브 파일 목록 조회 (폴더 필터 및 파일별 소속 폴더 정보 포함)
 */
async function listFiles({ query = '', pageToken = null, pageSize = 30, folderType = null } = {}) {
  return await runWithDrive(async (drive, rootFolderId) => {
    // 1. 하위 폴더 맵핑 획득 (폴더 ID -> 폴더명)
    const subfolderMap = await getSubfolderMap(drive, rootFolderId);

    // 2. 검색 대상 폴더 결정
    let parentFolderId = null;
    if (folderType && folderType !== 'all') {
      parentFolderId = await getOrCreateSubfolder(drive, rootFolderId, folderType);
    }

    // 3. 쿼리 조건 생성
    let q = 'trashed = false and mimeType != \'application/vnd.google-apps.folder\'';
    if (parentFolderId) {
      // 특정 폴더 지정 시
      q += ` and '${parentFolderId}' in parents`;
    } else {
      // 전체 조회 시: 루트 폴더 또는 하위 폴더들에 속한 파일들
      const allowedParents = [rootFolderId, ...Array.from(subfolderMap.keys())];
      const parentQueries = allowedParents.map(id => `'${id}' in parents`).join(' or ');
      q += ` and (${parentQueries})`;
    }

    if (query) {
      const escapedQuery = query.replace(/'/g, "\\'");
      q += ` and name contains '${escapedQuery}'`;
    }

    const response = await drive.files.list({
      q,
      pageSize,
      pageToken: pageToken || undefined,
      fields: 'nextPageToken, files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, iconLink, thumbnailLink, parents)',
      orderBy: 'modifiedTime desc',
    });

    // 각 파일에 소속 폴더명(folderName) 부여
    const filesWithFolder = (response.data.files || []).map(f => {
      let folderName = '루트';
      if (f.parents && f.parents.length > 0) {
        const parentId = f.parents[0];
        if (subfolderMap.has(parentId)) {
          folderName = subfolderMap.get(parentId);
        } else if (parentId === rootFolderId) {
          folderName = '루트';
        }
      }
      return {
        ...f,
        folderName,
      };
    });

    return {
      ...response.data,
      files: filesWithFolder,
      subfolders: Array.from(subfolderMap.values()),
    };
  });
}

/**
 * 구글 드라이브 스토리지 용량 정보 조회
 */
async function getStorageQuota() {
  try {
    return await runWithDrive(async (drive) => {
      const response = await drive.about.get({
        fields: 'storageQuota, user',
      });
      return response.data;
    });
  } catch (error) {
    console.warn('[Google Drive] 용량 조회 실패 (권한 제한일 수 있음):', error.message);
    return null;
  }
}

module.exports = {
  FOLDER_TYPES,
  getOrCreateSubfolder,
  uploadFile,
  deleteFile,
  moveFile,
  uploadWithCleanup,
  listFiles,
  getStorageQuota,
  runWithDrive,
};
