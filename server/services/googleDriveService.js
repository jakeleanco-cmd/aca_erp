const { google } = require('googleapis');
const fs = require('fs');

/**
 * 구글 드라이브 서비스 (Service Account 방식)
 * - OAuth2 방식의 refresh_token 만료 문제를 근본적으로 해결하기 위해 Service Account를 사용합니다.
 * - Service Account는 만료 없이 영구적으로 사용 가능하며, 별도의 사용자 인증이 필요 없습니다.
 * - 환경 변수 GOOGLE_DRIVE_KEY_JSON에 Service Account의 JSON 키 내용을 넣어주세요.
 */

/**
 * PEM 형식의 Private Key를 안전하게 정규화
 * - .env 또는 Vercel 환경 변수에서 개행 문자가 손상되거나 축약된 경우에도 완벽한 PEM 형식으로 복구합니다.
 */
const formatPrivateKey = (rawKey) => {
  if (!rawKey) return '';
  // 헤더, 푸터, 개행, 공백 제거 후 순수 base64 문자열 추출
  const body = rawKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');

  // 64글자 단위 개행 추가 (표준 PEM 규격)
  const formattedBody = body.match(/.{1,64}/g)?.join('\n') || body;
  return `-----BEGIN PRIVATE KEY-----\n${formattedBody}\n-----END PRIVATE KEY-----\n`;
};

// OAuth2 토큰 만료 상태를 메모리에 캐싱하여 반복적인 실패 요청 방지
let isOAuthTokenExpired = false;

/**
 * Service Account 기반의 드라이브 컨텍스트 생성
 */
const getServiceAccountContext = (folderId) => {
  const keyJson = process.env.GOOGLE_DRIVE_KEY_JSON;
  if (!keyJson) return null;

  let credentials;
  try {
    if (typeof keyJson === 'object') {
      credentials = keyJson;
    } else {
      try {
        credentials = JSON.parse(keyJson);
      } catch (e) {
        const fixed = keyJson.replace(
          /("private_key"\s*:\s*")([\s\S]*?)("(?:\s*,|\s*}))/g,
          (match, p1, p2, p3) => {
            const escapedContent = p2
              .replace(/\\n/g, '\n')
              .replace(/\r?\n/g, '\\n');
            return p1 + escapedContent + p3;
          }
        );
        credentials = JSON.parse(fixed);
      }
    }
  } catch (e) {
    console.error('[Google Drive] GOOGLE_DRIVE_KEY_JSON 파싱 실패:', e.message);
    return null;
  }

  if (credentials && credentials.private_key) {
    credentials.private_key = formatPrivateKey(credentials.private_key);
  }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  return {
    drive: google.drive({ version: 'v3', auth }),
    folderId,
    authType: 'ServiceAccount',
  };
};

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
 * 드라이브 API 호출 공통 실행 함수:
 * - 1순위: OAuth2 시도 (토큰이 만료되지 않은 경우)
 * - 만약 OAuth2에서 invalid_grant(토큰 만료)가 발생하면, 즉시 Service Account로 fallback하여 재시도
 * - 2순위: Service Account 사용
 */
const runWithDrive = async (operation) => {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID 환경 변수가 설정되지 않았습니다.');
  }

  // 1. OAuth2 시도 (만료 플래그가 안 켜져 있는 경우)
  if (!isOAuthTokenExpired) {
    const oauthContext = getOAuth2Context(folderId);
    if (oauthContext) {
      try {
        return await operation(oauthContext.drive, oauthContext.folderId, 'OAuth2');
      } catch (err) {
        if (isTokenExpiredError(err)) {
          console.warn('[Google Drive] OAuth2 Refresh Token 만료 감지 (invalid_grant). Service Account로 자동 전환합니다.');
          isOAuthTokenExpired = true;
        } else {
          // 토큰 만료 외의 에러는 그대로 throw
          throw err;
        }
      }
    }
  }

  // 2. Service Account로 실행 (OAuth2가 없거나 만료되었을 때)
  const saContext = getServiceAccountContext(folderId);
  if (saContext) {
    return await operation(saContext.drive, saContext.folderId, 'ServiceAccount');
  }

  throw new Error('사용 가능한 구글 드라이브 인증 정보가 없습니다. Service Account(GOOGLE_DRIVE_KEY_JSON) 또는 유효한 REFRESH_TOKEN을 확인해주세요.');
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
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      },
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
