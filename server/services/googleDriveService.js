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

// 드라이브 클라이언트와 폴더 ID를 가져오는 함수 (OAuth2 우선, Service Account fallback)
const getDriveContext = () => {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID 환경 변수가 설정되지 않았습니다.');
  }

  // 1. OAuth2 Refresh Token 방식 (개인 구글 드라이브 용량 사용 시 최우선)
  const clientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

  if (clientId && clientSecret && refreshToken) {
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    oauth2Client.setCredentials({ refresh_token: refreshToken });
    return {
      drive: google.drive({ version: 'v3', auth: oauth2Client }),
      folderId,
      authType: 'OAuth2'
    };
  }

  // 2. Service Account 방식 (Google Workspace 공유 드라이브 환경 등)
  const keyJson = process.env.GOOGLE_DRIVE_KEY_JSON;
  if (keyJson) {
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
      throw new Error('GOOGLE_DRIVE_KEY_JSON 파싱 실패: JSON 형식을 확인해주세요. (' + e.message + ')');
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
      authType: 'ServiceAccount'
    };
  }

  throw new Error('구글 드라이브 인증 정보가 없습니다. GOOGLE_DRIVE_REFRESH_TOKEN 또는 GOOGLE_DRIVE_KEY_JSON을 설정해주세요.');
};

/**
 * 구글 드라이브로 파일 업로드
 */
async function uploadFile(file) {
  const { drive, folderId } = getDriveContext();
  
  if (!folderId) {
    const errorMsg = 'GOOGLE_DRIVE_FOLDER_ID 환경 변수가 설정되지 않았습니다.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  try {
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
        parents: [folderId],
      },
      media: {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      },
      fields: 'id, name, webViewLink, webContentLink',
    });

    console.log(`[Google Drive] 업로드 성공: ${response.data.id}`);

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
  } catch (error) {
    console.error('[Google Drive] 업로드 중 치명적 에러:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * 구글 드라이브에서 파일 삭제
 */
async function deleteFile(fileId) {
  if (!fileId) return;
  const { drive } = getDriveContext();
  try {
    console.log(`[Google Drive] 파일 삭제 중: ${fileId}`);
    await drive.files.delete({ fileId });
  } catch (error) {
    console.warn('[Google Drive] 삭제 중 경고:', error.message);
  }
}

/**
 * 업로드 후 로컬 임시 파일 삭제까지 수행하는 헬퍼 함수
 */
async function uploadWithCleanup(file) {
  if (!file || !file.path) {
    throw new Error('전송된 파일 정보가 올바르지 않습니다.');
  }

  try {
    const driveInfo = await uploadFile(file);
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

module.exports = {
  uploadFile,
  deleteFile,
  uploadWithCleanup,
};
