const { google } = require('googleapis');
const fs = require('fs');

/**
 * 구글 드라이브 서비스 (OAuth2 방식 - 안정화 버전)
 * 환경 변수 로딩 시점 문제를 해결하기 위해 Getter 방식을 사용합니다.
 */

// 드라이브 클라이언트와 폴더 ID를 가져오는 함수
const getDriveContext = () => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_DRIVE_CLIENT_ID,
    process.env.GOOGLE_DRIVE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_DRIVE_REFRESH_TOKEN,
  });

  return {
    drive: google.drive({ version: 'v3', auth: oauth2Client }),
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID
  };
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
        const latin1Buffer = Buffer.from(file.originalname, 'latin1');
        const utf8String = latin1Buffer.toString('utf8');
        // 실제로 변환이 필요한 경우(멀티바이트 문자가 포함된 경우)만 적용
        if (utf8String !== file.originalname) {
          name = utf8String;
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

    // 권한 설정
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
