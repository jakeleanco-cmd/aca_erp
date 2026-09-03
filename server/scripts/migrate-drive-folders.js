require('dotenv').config();
const mongoose = require('mongoose');
const { migrateDriveFiles } = require('../services/googleDriveMigrationService');

async function main() {
  const isDryRun = process.argv.includes('--dry-run');

  try {
    console.log('MongoDB 연결 중...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('MongoDB 연결 성공.');

    console.log(`구글 드라이브 폴더 마이그레이션을 시작합니다. (dryRun: ${isDryRun})`);
    const result = await migrateDriveFiles({ dryRun: isDryRun });

    if (isDryRun) {
      console.log('\n=== [Dry-Run 시뮬레이션 결과] ===');
      console.log(`총 이동 대상 파일: ${result.totalCount}건`);
      console.log('폴더별 분류 예정 통계:', JSON.stringify(result.summary, null, 2));
      console.log('\n실제 이동을 진행하려면 다음 명령어를 실행하세요:');
      console.log('node server/scripts/migrate-drive-folders.js');
    } else {
      console.log('\n=== [마이그레이션 완료 결과] ===');
      console.log(`총 처리 파일: ${result.totalCount}건`);
      console.log(`성공: ${result.successCount}건`);
      console.log(`실패: ${result.failCount}건`);
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('마이그레이션 중 오류 발생:', err);
    await mongoose.disconnect();
    process.exit(1);
  }
}

main();
