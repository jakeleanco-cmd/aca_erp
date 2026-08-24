import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Space, Typography, Tag, Popconfirm, message, DatePicker, Upload, Spin, Row, Col, Card,
  Progress, Statistic, List
} from 'antd';
import { 
  PlusOutlined, EditOutlined, 
  UploadOutlined, FilePdfOutlined, PictureOutlined, DeleteOutlined,
  AreaChartOutlined, SafetyCertificateOutlined, AlertOutlined, BookOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import { SCHOOL_LEVELS } from '../constants/learning';

const MIDTERM_PREP_EXAM_TYPES = [
  '최다빈출', '서술형',
  '강남3구기출(객관식)', '강남3구기출(서술형)',
  '최다오답', '고난이도', '학교기출',
];

const DATE_FORMATS = ['YYYY.MM.DD', 'YY.MM.DD', 'YYYY-MM-DD', 'YY-MM-DD', 'YYYYMMDD', 'YYMMDD'];

const CURRENT_YEAR = dayjs().year();

const checkFileIsImage = (filename) => {
  return filename && filename.match(/\.(jpeg|jpg|gif|png)$/i) != null;
};

const checkPassed = (rec) => {
  if (!rec) return false;
  if (rec.totalQuestions > 0 && rec.correctCount !== undefined && rec.correctCount !== null) {
    return (rec.correctCount / rec.totalQuestions) >= 0.8;
  }
  return (rec.score || 0) >= 80;
};

export default function MidtermPrepMatrixTab({ studentId, student }) {
  const [form] = Form.useForm();
  const [examSheetForm] = Form.useForm();

  // Filters
  const [filterYear, setFilterYear] = useState(CURRENT_YEAR);
  const [filterLevel, setFilterLevel] = useState(student?.schoolLevel || '중등');
  const [filterGrade, setFilterGrade] = useState(student?.gradeLabel || '중2');
  const [filterSemester, setFilterSemester] = useState('1학기');
  const [filterTerm, setFilterTerm] = useState('중간');

  // Data
  const [loading, setLoading] = useState(false);
  const [papers, setPapers] = useState([]);
  const [records, setRecords] = useState([]);
  const [actualExams, setActualExams] = useState([]); // 실전 내신성적 (ExamSheet)

  // Status
  const [modalOpen, setModalOpen] = useState(false);
  const [sheetModalOpen, setSheetModalOpen] = useState(false);
  const [editingExamId, setEditingExamId] = useState(null);
  const [editingSheetId, setEditingSheetId] = useState(null);
  const [fileList, setFileList] = useState([]);
  const [activeCell, setActiveCell] = useState(null); // { chapterName, examType, paperId, totalQuestions }
  const [reportModalOpen, setReportModalOpen] = useState(false);

  useEffect(() => {
    if (studentId) {
      fetchMatrixData();
    }
  }, [studentId, filterYear, filterLevel, filterGrade, filterSemester, filterTerm]);
  
  // 학생 정보가 변경되면 필터 자동 동기화
  useEffect(() => {
    if (student) {
      if (student.schoolLevel) setFilterLevel(student.schoolLevel);
      if (student.gradeLabel) setFilterGrade(student.gradeLabel);
    }
  }, [student]);

  const fetchMatrixData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Master ExamPapers
      const papersRes = await client.get('/exam-papers', {
        params: {
          category: '내신준비평가',
          schoolLevel: filterLevel,
          gradeLabel: filterGrade,
          semester: filterSemester,
          examTerm: filterTerm,
        }
      });
      setPapers(papersRes.data);

      // 2. Fetch Student's FormativeExams
      const recordsRes = await client.get(`/formative-exams/by-student/${studentId}`, {
        params: {
          category: '내신준비평가'
        }
      });
      // 필터 적용 (서버 필터가 완벽하지 않으므로 클라이언트에서도 한번 더 거름)
      const filteredRecords = recordsRes.data.filter(r => 
        r.gradeLabel === filterGrade && 
        r.semester === filterSemester && 
        r.examPeriod === filterTerm
      );
      setRecords(filteredRecords);

      // 3. Fetch Student's ExamSheets (실전 내신성적)
      const sheetsRes = await client.get(`/exam-sheets/by-student/${studentId}`);
      setActualExams(sheetsRes.data);

    } catch (err) {
      message.error('데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 행(Row) 생성: 마스터 데이터에서 존재하는 chapter(title) 고유값 추출
  const chapters = useMemo(() => {
    const titles = papers.map(p => p.title).filter(Boolean);
    const uniqueTitles = Array.from(new Set(titles));
    // Prefix 기준 정렬 개선 (예: "1-1.유리수" "1-2.단항식")
    return uniqueTitles.sort((a, b) => a.localeCompare(b, 'ko-KR', { numeric: true }));
  }, [papers]);

  // 실전 내신성적 매칭
  const targetSheetPeriod = `${filterSemester} ${filterTerm}`; // 예: "1학기 중간"
  const matchedSheet = actualExams.find(s => s.year === filterYear && s.semester === targetSheetPeriod);

  // 시험준비평가 성과분석용 통계 연산
  const reportStats = useMemo(() => {
    if (records.length === 0) return null;
    
    // 1. 전체 평균 점수
    const totalScoreSum = records.reduce((sum, r) => sum + (r.score || 0), 0);
    const avgScore = Math.round(totalScoreSum / records.length);
    
    // 2. 전체 통과율 (80점 이상)
    const passedCount = records.filter(r => checkPassed(r)).length;
    const passRate = Math.round((passedCount / records.length) * 100);
    
    // 3. 유형별 통계
    const typeStats = MIDTERM_PREP_EXAM_TYPES.map(type => {
      const typeRecords = records.filter(r => r.examType === type);
      const avg = typeRecords.length > 0 
        ? Math.round(typeRecords.reduce((sum, r) => sum + (r.score || 0), 0) / typeRecords.length)
        : 0;
      const passed = typeRecords.filter(r => checkPassed(r)).length;
      const rate = typeRecords.length > 0 ? Math.round((passed / typeRecords.length) * 100) : 0;
      
      return {
        type,
        count: typeRecords.length,
        avgScore: avg,
        passRate: rate
      };
    });
    
    // 4. 취약 단원 분석 (평균 점수가 80점 미만인 단원 리스트업)
    const weakChapters = [];
    const chapterMap = {};
    records.forEach(r => {
      const chName = r.chapterName || r.title;
      if (!chName) return;
      if (!chapterMap[chName]) {
        chapterMap[chName] = { sum: 0, count: 0 };
      }
      chapterMap[chName].sum += (r.score || 0);
      chapterMap[chName].count += 1;
    });
    
    Object.keys(chapterMap).forEach(name => {
      const avg = Math.round(chapterMap[name].sum / chapterMap[name].count);
      if (avg < 80) {
        weakChapters.push({ name, avgScore: avg });
      }
    });
    weakChapters.sort((a, b) => a.avgScore - b.avgScore); // 성적이 취약한 단원 순으로 정렬

    return {
      avgScore,
      passRate,
      totalCount: records.length,
      typeStats,
      weakChapters
    };
  }, [records]);

  // --- Handlers for FormativeExam (1~7단계) ---
  const handleOpenRecord = (chapterName, examType, paper) => {
    setActiveCell({ chapterName, examType, paperId: paper?._id, totalQuestions: paper?.totalQuestions });
    form.resetFields();
    form.setFieldsValue({
      examDate: dayjs(),
      correctCount: null,
      score: null,
      schoolName: '',
      year: CURRENT_YEAR, // 기본값으로 현재 년도 세팅
      totalQuestions: paper?.totalQuestions || null,
      memo: ''
    });
    setFileList([]);
    setEditingExamId(null);
    setModalOpen(true);
  };

  const handleOpenSchoolRecord = () => {
    setActiveCell({ chapterName: '', examType: '학교기출', paperId: null, totalQuestions: null });
    form.resetFields();
    form.setFieldsValue({
      examDate: dayjs(),
      correctCount: null,
      score: null,
      schoolName: '',
      year: null,
      totalQuestions: null,
      memo: '',
      paperId: null
    });
    setFileList([]);
    setEditingExamId(null);
    setModalOpen(true);
  };

  const handleEditRecord = (record) => {
    const isSchool = record.examType === '학교기출';
    let editYear = record.year;
    if (editYear && editYear > 2000) editYear = editYear - 2000;

    setActiveCell({ 
      chapterName: record.chapterName || record.title, 
      examType: record.examType, 
      paperId: record.examPaper?._id || record.examPaper,
      totalQuestions: record.totalQuestions
    });
    form.setFieldsValue({
      examDate: dayjs(record.examDate),
      correctCount: record.correctCount,
      score: record.score,
      schoolName: record.schoolName,
      year: editYear,
      totalQuestions: record.totalQuestions,
      memo: record.memo,
      paperId: record.examPaper?._id || record.examPaper || null
    });
    setEditingExamId(record._id);

    const initialFiles = (record.attachments || []).map((att, i) => ({
      uid: -i,
      name: att.filename,
      status: 'done',
      url: `/api${att.path}`
    }));
    setFileList(initialFiles);
    setModalOpen(true);
  };

  const handleSaveRecord = async () => {
    try {
      const vals = await form.validateFields();
      const formData = new FormData();
      
      formData.append('category', '내신준비평가');
      formData.append('examType', activeCell.examType);
      
      // 단원명 및 타이틀 결정
      const targetPaperId = vals.paperId || activeCell.paperId;
      let finalTitle = activeCell.chapterName;
      if (activeCell.examType === '학교기출') {
        if (targetPaperId) {
          const matchedPaper = papers.find(p => p._id === targetPaperId);
          if (matchedPaper) finalTitle = matchedPaper.title;
        } else {
          finalTitle = `${vals.year ? vals.year + '년 ' : ''}${vals.schoolName || '학교기출'}`;
        }
      }
      formData.append('title', finalTitle);
      formData.append('chapterName', finalTitle);

      formData.append('student', studentId);
      formData.append('schoolLevel', filterLevel);
      formData.append('gradeLabel', filterGrade);
      formData.append('semester', filterSemester);
      formData.append('examPeriod', filterTerm); 
      formData.append('examDate', vals.examDate.toISOString());
      
      if (targetPaperId) formData.append('examPaper', targetPaperId);
      
      const totalQ = vals.totalQuestions !== undefined && vals.totalQuestions !== null ? vals.totalQuestions : activeCell.totalQuestions;
      if (totalQ) formData.append('totalQuestions', totalQ);
      
      if (vals.correctCount !== undefined && vals.correctCount !== null) formData.append('correctCount', vals.correctCount);
      if (vals.score !== undefined && vals.score !== null) formData.append('score', vals.score);
      if (vals.schoolName) formData.append('schoolName', vals.schoolName);
      if (vals.year !== undefined && vals.year !== null) formData.append('year', vals.year);
      if (vals.memo) formData.append('memo', vals.memo);

      fileList.forEach((file) => {
        const fileToUpload = file.originFileObj || file;
        if (fileToUpload instanceof File) formData.append('files', fileToUpload);
      });

      if (editingExamId) {
        const existingFiles = fileList.filter(f => !f.originFileObj && f.url).map(f => f.name);
        formData.append('existingFiles', JSON.stringify(existingFiles));
        await client.put(`/formative-exams/${editingExamId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
        message.success('수정되었습니다.');
      } else {
        await client.post('/formative-exams', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
        message.success('저장되었습니다.');
      }
      setModalOpen(false);
      fetchMatrixData();
    } catch (err) {
      message.error('저장에 실패했습니다.');
    }
  };

  const handleDeleteRecord = async (id) => {
    try {
      await client.delete(`/formative-exams/${id}`);
      message.success('삭제되었습니다.');
      fetchMatrixData();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  // --- Handlers for ExamSheet (8단계 실전) ---
  const handleOpenSheet = () => {
    examSheetForm.resetFields();
    examSheetForm.setFieldsValue({
      score: null,
      schoolName: '',
      subject: '수학',
      memo: ''
    });
    setFileList([]);
    setEditingSheetId(null);
    setSheetModalOpen(true);
  };

  const handleEditSheet = () => {
    examSheetForm.setFieldsValue({
      score: matchedSheet.score,
      schoolName: matchedSheet.schoolName,
      subject: matchedSheet.subject || '수학',
      memo: matchedSheet.memo,
    });
    setEditingSheetId(matchedSheet._id);

    const initialFiles = (matchedSheet.attachments || []).map((att, i) => ({
      uid: -i,
      name: att.filename,
      status: 'done',
      url: `/api${att.path}`
    }));
    setFileList(initialFiles);
    setSheetModalOpen(true);
  };

  const handleSaveSheet = async () => {
    try {
      const vals = await examSheetForm.validateFields();
      const formData = new FormData();
      
      formData.append('student', studentId);
      formData.append('year', filterYear);
      formData.append('semester', targetSheetPeriod);
      formData.append('subject', vals.subject);
      if (vals.schoolName) formData.append('schoolName', vals.schoolName);
      if (vals.score !== undefined && vals.score !== null) formData.append('score', vals.score);
      if (vals.memo) formData.append('memo', vals.memo);

      fileList.forEach((file) => {
        const fileToUpload = file.originFileObj || file;
        if (fileToUpload instanceof File) formData.append('files', fileToUpload);
      });

      if (editingSheetId) {
        const existingFiles = fileList.filter(f => !f.originFileObj && f.url).map(f => f.name);
        formData.append('existingFiles', JSON.stringify(existingFiles));
        await client.put(`/exam-sheets/${editingSheetId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
        message.success('실전 내신성적이 수정되었습니다.');
      } else {
        await client.post('/exam-sheets', formData, { headers: { 'Content-Type': 'multipart/form-data' }});
        message.success('실전 내신성적이 등록되었습니다.');
      }
      setSheetModalOpen(false);
      fetchMatrixData();
    } catch (err) {
      message.error('저장에 실패했습니다.');
    }
  };

  const handleDeleteSheet = async () => {
    try {
      await client.delete(`/exam-sheets/${matchedSheet._id}`);
      message.success('삭제되었습니다.');
      fetchMatrixData();
    } catch {
      message.error('삭제에 실패했습니다.');
    }
  };

  // --- Render Utilities ---
  const uploadProps = {
    onRemove: (file) => setFileList(fileList.filter(f => f !== file)),
    beforeUpload: (file) => { setFileList([...fileList, file]); return false; },
    fileList,
    listType: "picture",
  };

  const hasData = (chapterName, examType) => {
    const paper = papers.find(p => p.title === chapterName && p.examType === examType);
    const cellRecords = records.filter(r => {
      const matchType = r.examType === examType;
      const matchChapter = r.chapterName === chapterName || r.title === chapterName;
      if (paper && r.examPaper) {
        return r.examPaper._id === paper._id || r.examPaper === paper._id;
      }
      return matchType && matchChapter;
    });
    return !!paper || cellRecords.length > 0;
  };

  const renderCellContent = (chapterName, examType) => {
    const isMultiMode = examType === '학교기출';
    const paper = papers.find(p => p.title === chapterName && p.examType === examType);
    
    // 이력 순서대로 정렬 (날짜 오름차순)
    const cellRecords = records
      .filter(r => {
        const matchType = r.examType === examType;
        const matchChapter = r.chapterName === chapterName || r.title === chapterName;
        if (paper && r.examPaper) {
          return r.examPaper._id === paper._id || r.examPaper === paper._id;
        }
        return matchType && matchChapter;
      })
      .sort((a, b) => dayjs(a.examDate).unix() - dayjs(b.examDate).unix());

    if (!paper && cellRecords.length === 0) {
      return null;
    }

    const renderSingleRecord = (rec, idx) => {
      let displayScore = rec.score > 0 ? `${rec.score}점` : '-';
      if (rec.totalQuestions > 0 && rec.correctCount !== undefined && rec.correctCount !== null) {
         displayScore = `${rec.correctCount}/${rec.totalQuestions}`;
      }
      
      const passed = checkPassed(rec);
      const isBad = !passed && (rec.score < 60 || (rec.totalQuestions > 0 && (rec.correctCount / rec.totalQuestions) < 0.6));

      const yearStr = rec.year ? `${rec.year}년` : '';
      const schoolStr = rec.schoolName ? `${rec.schoolName}` : '';
      
      let displayText = '';
      if (isMultiMode) {
        const parts = [];
        if (yearStr) parts.push(yearStr);
        if (schoolStr) parts.push(schoolStr);
        if (rec.totalQuestions) parts.push(`${rec.totalQuestions}문항`);
        if (rec.score !== undefined && rec.score !== null) {
          const detail = (rec.correctCount !== undefined && rec.correctCount !== null && rec.totalQuestions > 0)
            ? ` (${rec.correctCount}/${rec.totalQuestions})`
            : '';
          parts.push(`${rec.score}점${detail}`);
        } else {
          parts.push(displayScore);
        }
        displayText = parts.join(' | ');
      } else {
        displayText = schoolStr ? `${schoolStr}: ${displayScore}` : displayScore;
      }

      return (
        <div key={rec._id} style={{ marginBottom: 4 }}>
          <Space size="small">
             <Tag 
               color={passed ? 'green' : isBad ? 'red' : 'orange'} 
               style={{ cursor: 'pointer', margin: 0 }}
               onClick={() => handleEditRecord(rec)}
             >
               {idx > 0 ? '[재시험] ' : ''}
               {displayText}
             </Tag>
             {(rec.attachments || []).map(att => {
                const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
                return (
                  <a key={att.filename} href={fileUrl} target="_blank" rel="noopener noreferrer" title="결과 보기" onClick={e=>e.stopPropagation()}>
                    {checkFileIsImage(att.filename) ? <PictureOutlined /> : <FilePdfOutlined style={{ color: '#ff4d4f' }} />}
                  </a>
                );
             })}
          </Space>
        </div>
      );
    };

    const latestRecord = cellRecords[cellRecords.length - 1];
    const latestPassed = checkPassed(latestRecord);
    const showAddButton = isMultiMode || cellRecords.length === 0 || !latestPassed;

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        {/* 원본 시험지 링크 */}
        {paper && (
          <div>
            {paper.attachments?.map(att => {
              const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
              return (
                <a key={att.filename} href={fileUrl} target="_blank" rel="noopener noreferrer" title="시험지(문제) 열기">
                  <Tag icon={<FilePdfOutlined />} style={{ background: '#f0f5ff', borderColor: '#adc6ff', color: '#2f54eb' }}>
                    시험지
                  </Tag>
                </a>
              );
            })}
          </div>
        )}

        {/* 기록 목록 */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {cellRecords.map((rec, i) => renderSingleRecord(rec, i))}
        </div>

        {/* 플러스 버튼 */}
        {showAddButton && (
          <Button 
            type="dashed" 
            size="small" 
            icon={<PlusOutlined />} 
            onClick={() => handleOpenRecord(chapterName, examType, paper)}
            style={{ fontSize: 11 }}
          >
            {cellRecords.length > 0 ? '재시험 기록' : '기록'}
          </Button>
        )}
      </div>
    );
  };
  const handleSyncExams = async () => {
    setLoading(true);
    try {
      // 현재 선택된 필터 조건만 동기화 범위로 전달
      const res = await client.post('/exam-papers/sync-local', {
        gradeLabel: filterGrade,
        semester: filterSemester,
        examTerm: filterTerm
      });
      message.success(`동기화 완료: ${res.data.successCount}개 추가, ${res.data.skipCount}개 건너뜀, ${res.data.prunedCount || 0}개 정리`);
      fetchMatrixData();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || '동기화 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 1. 필터 영역 */}
      <Card size="small" style={{ marginBottom: 16, backgroundColor: '#fafafa' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <Space wrap size={[16, 12]}>
            <Space>
              <Typography.Text strong>년도</Typography.Text>
              <InputNumber value={filterYear} onChange={setFilterYear} style={{ width: 80 }} />
            </Space>
            <Space>
              <Typography.Text strong>학교급</Typography.Text>
              <Select value={filterLevel} onChange={setFilterLevel} options={SCHOOL_LEVELS.map(v=>({label:v, value:v}))} style={{ width: 80 }} />
            </Space>
            <Space>
              <Typography.Text strong>학년</Typography.Text>
              <Select value={filterGrade} onChange={setFilterGrade} options={['중1','중2','중3','고1','고2','고3'].map(v=>({label:v, value:v}))} style={{ width: 80 }} />
            </Space>
            <Space>
              <Typography.Text strong>학기</Typography.Text>
              <Select value={filterSemester} onChange={setFilterSemester} options={['1학기','2학기'].map(v=>({label:v, value:v}))} style={{ width: 80 }} />
            </Space>
            <Space>
              <Typography.Text strong>고사</Typography.Text>
              <Select value={filterTerm} onChange={setFilterTerm} options={['중간','기말'].map(v=>({label:v, value:v}))} style={{ width: 80 }} />
            </Space>
          </Space>
          <Space>
            <Button 
              onClick={() => setReportModalOpen(true)} 
              type="default" 
              icon={<AreaChartOutlined />}
              disabled={records.length === 0}
              style={{ borderColor: '#2f54eb', color: '#2f54eb' }}
            >
              성과분석 리포트
            </Button>
            <Button onClick={handleSyncExams} type="primary" loading={loading}>시험지 갱신</Button>
          </Space>
        </div>
      </Card>

      {/* 2. 유형별 리스트 뷰 */}
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {MIDTERM_PREP_EXAM_TYPES.map((type, idx) => {
            if (type === '학교기출') {
              const schoolRecords = records.filter(r => r.examType === '학교기출');

              return (
                <Card 
                  key={type} 
                  title={
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <Typography.Title level={5} style={{ margin: 0 }}>{idx + 1}. {type}</Typography.Title>
                      <Button 
                        type="primary" 
                        size="small" 
                        icon={<PlusOutlined />} 
                        onClick={handleOpenSchoolRecord}
                      >
                        기출 기록 추가
                      </Button>
                    </div>
                  }
                  size="small"
                  styles={{ body: { padding: 0 } }}
                >
                  <Table 
                    dataSource={schoolRecords}
                    rowKey="_id"
                    pagination={false}
                    size="small"
                    bordered
                    columns={[
                      { 
                        title: '기출년도', 
                        dataIndex: 'year', 
                        width: 100,
                        render: (v) => {
                          if (!v) return '-';
                          const vStr = String(v);
                          const formatted = vStr.length === 4 ? vStr.slice(2) : vStr;
                          return <Typography.Text strong>{formatted}년</Typography.Text>;
                        }
                      },
                      { 
                        title: '학교명', 
                        dataIndex: 'schoolName',
                        width: 150,
                        render: (v) => <Typography.Text strong>{v || '-'}</Typography.Text>
                      },
                      { 
                        title: '총문항수', 
                        dataIndex: 'totalQuestions', 
                        width: 100,
                        render: (v) => v ? `${v}문항` : '-'
                      },
                      { 
                        title: '맞은 개수', 
                        width: 100,
                        render: (_, rec) => {
                          const v = rec.correctCount;
                          const displayText = v !== undefined && v !== null ? `${v}개` : '-';
                          return (
                            <span 
                              style={{ cursor: 'pointer', color: '#1677ff', textDecoration: 'underline' }}
                              onClick={() => handleEditRecord(rec)}
                              title="클릭하여 수정"
                            >
                              {displayText}
                            </span>
                          );
                        }
                      },
                      { 
                        title: '점수', 
                        dataIndex: 'score',
                        width: 100,
                        render: (v) => v !== undefined && v !== null ? `${v}점` : '-'
                      },
                      {
                        title: '시험지 및 풀이지',
                        render: (_, rec) => {
                          const paper = rec.examPaper;
                          const paperAttachments = paper?.attachments || [];
                          const studentAttachments = rec.attachments || [];
                          return (
                            <Space size="middle">
                              {paper ? (
                                <Space size="small">
                                  {paperAttachments.map(att => {
                                    const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
                                    return (
                                      <a 
                                        key={att.filename} 
                                        href={fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        title="원본 PDF 열기"
                                      >
                                        <Tag icon={<FilePdfOutlined />} style={{ background: '#f0f5ff', borderColor: '#adc6ff', color: '#2f54eb', cursor: 'pointer', margin: 0 }}>
                                          시험지
                                        </Tag>
                                      </a>
                                    );
                                  })}
                                  <span 
                                    style={{ cursor: 'pointer', color: '#1677ff', textDecoration: 'underline', fontSize: '12px' }}
                                    onClick={() => handleEditRecord(rec)}
                                    title="클릭하여 시험지 연결 변경"
                                  >
                                    ({paper.title})
                                  </span>
                                </Space>
                              ) : (
                                <Tag 
                                  color="default" 
                                  style={{ cursor: 'pointer', borderStyle: 'dashed', margin: 0 }}
                                  onClick={() => handleEditRecord(rec)}
                                  title="클릭하여 시험지 연결하기"
                                >
                                  시험지 연결하기
                                </Tag>
                              )}
                              {studentAttachments.map(att => {
                                const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
                                return (
                                  <a key={att.filename} href={fileUrl} target="_blank" rel="noopener noreferrer" title="풀이지/결과지 보기">
                                    {checkFileIsImage(att.filename) ? <PictureOutlined style={{ fontSize: 16 }} /> : <FilePdfOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />}
                                  </a>
                                );
                              })}
                            </Space>
                          );
                        }
                      },
                      {
                        title: '관리',
                        width: 100,
                        render: (_, rec) => (
                          <Space>
                            <Button size="small" icon={<EditOutlined />} onClick={() => handleEditRecord(rec)} />
                            <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => handleDeleteRecord(rec._id)}>
                              <Button size="small" danger type="text" icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        )
                      }
                    ]}
                  />
                </Card>
              );
            }

            const typePapers = papers
              .filter(p => p.examType === type)
              .sort((a, b) => (a.title || '').localeCompare(b.title || '', 'ko-KR', { numeric: true }));

            if (typePapers.length === 0) return null;

            return (
              <Card 
                key={type} 
                title={<Typography.Title level={5} style={{ margin: 0 }}>{idx + 1}. {type}</Typography.Title>}
                size="small"
                styles={{ body: { padding: 0 } }}
              >
                <Table 
                  dataSource={typePapers}
                  rowKey="_id"
                  pagination={false}
                  size="small"
                  bordered
                  columns={[
                    { 
                      title: '단원명', 
                      dataIndex: 'title', 
                      width: 200,
                      render: (v) => <Typography.Text strong>{v}</Typography.Text>
                    },
                    { 
                      title: '총문항수', 
                      dataIndex: 'totalQuestions', 
                      width: 100,
                      render: (v) => v ? `${v}문항` : '-'
                    },
                    { 
                      title: '맞은 개수', 
                      width: 120,
                      render: (_, paper) => {
                        const cellRecords = records
                          .filter(r => r.examPaper?._id === paper._id || (r.examType === type && r.chapterName === paper.title))
                          .sort((a, b) => dayjs(a.examDate).unix() - dayjs(b.examDate).unix());

                        if (cellRecords.length === 0) {
                          return '-';
                        }
                        return (
                          <div>
                            {cellRecords.map((rec, i) => (
                              <div key={rec._id} style={{ marginBottom: 4 }}>
                                <span 
                                  style={{ cursor: 'pointer', color: '#1677ff', textDecoration: 'underline' }}
                                  onClick={() => handleEditRecord(rec)}
                                  title="클릭하여 수정"
                                >
                                  {i > 0 ? `[재] ` : ''}{rec.correctCount !== undefined && rec.correctCount !== null ? `${rec.correctCount}개` : '-'}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      }
                    },
                    { 
                      title: '점수', 
                      width: 100,
                      render: (_, paper) => {
                        const cellRecords = records
                          .filter(r => r.examPaper?._id === paper._id || (r.examType === type && r.chapterName === paper.title))
                          .sort((a, b) => dayjs(a.examDate).unix() - dayjs(b.examDate).unix());

                        if (cellRecords.length === 0) {
                          return '-';
                        }
                        return (
                          <div>
                            {cellRecords.map((rec, i) => (
                              <div key={rec._id} style={{ marginBottom: 4 }}>
                                {rec.score !== undefined && rec.score !== null ? `${rec.score}점` : '-'}
                              </div>
                            ))}
                          </div>
                        );
                      }
                    },
                    {
                      title: '시험지 및 풀이지',
                      render: (_, paper) => {
                        const cellRecords = records
                          .filter(r => r.examPaper?._id === paper._id || (r.examType === type && r.chapterName === paper.title))
                          .sort((a, b) => dayjs(a.examDate).unix() - dayjs(b.examDate).unix());

                        const paperAttachments = paper.attachments || [];
                        
                        return (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {paperAttachments.map(att => {
                              const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
                              return (
                                <a key={att.filename} href={fileUrl} target="_blank" rel="noopener noreferrer" title="원본 시험지 열기">
                                  <Tag icon={<FilePdfOutlined />} style={{ background: '#f0f5ff', borderColor: '#adc6ff', color: '#2f54eb', cursor: 'pointer', margin: 0 }}>
                                    시험지
                                  </Tag>
                                </a>
                              );
                            })}
                            
                            {cellRecords.map((rec, i) => {
                              const studentAttachments = rec.attachments || [];
                              if (studentAttachments.length === 0) return null;
                              return (
                                <div key={rec._id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <span style={{ fontSize: 11, color: '#8c8c8c' }}>{i > 0 ? `[재] ` : '1회: '}</span>
                                  {studentAttachments.map(att => {
                                    const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
                                    return (
                                      <a key={att.filename} href={fileUrl} target="_blank" rel="noopener noreferrer" title="풀이지/결과지 보기">
                                        {checkFileIsImage(att.filename) ? <PictureOutlined style={{ fontSize: 14 }} /> : <FilePdfOutlined style={{ fontSize: 14, color: '#ff4d4f' }} />}
                                      </a>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </Space>
                        );
                      }
                    },
                    {
                      title: '관리',
                      width: 150,
                      render: (_, paper) => {
                        const cellRecords = records
                          .filter(r => r.examPaper?._id === paper._id || (r.examType === type && r.chapterName === paper.title))
                          .sort((a, b) => dayjs(a.examDate).unix() - dayjs(b.examDate).unix());

                        const latestRecord = cellRecords[cellRecords.length - 1];
                        const latestPassed = checkPassed(latestRecord);
                        const showAddButton = cellRecords.length === 0 || !latestPassed;

                        return (
                          <Space direction="vertical" size="small" style={{ width: '100%' }}>
                            {showAddButton && (
                              <Button 
                                type="dashed" 
                                size="small" 
                                icon={<PlusOutlined />} 
                                onClick={() => handleOpenRecord(paper.title, type, paper)}
                                style={{ fontSize: 11 }}
                              >
                                {cellRecords.length > 0 ? '재시험 기록' : '기록'}
                              </Button>
                            )}
                            {cellRecords.map((rec) => (
                              <Space key={rec._id} size="small">
                                <Button size="small" icon={<EditOutlined />} onClick={() => handleEditRecord(rec)} />
                                <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => handleDeleteRecord(rec._id)}>
                                  <Button size="small" danger type="text" icon={<DeleteOutlined />} style={{ padding: 0 }} />
                                </Popconfirm>
                              </Space>
                            ))}
                          </Space>
                        );
                      }
                    }
                  ]}
                />
              </Card>
            );
          })}

          {/* 8. 실전 내신성적 (8단계) */}
          <Card 
            title={<Typography.Title level={5} style={{ margin: 0, color: '#1677ff' }}>8. 실전 내신성적</Typography.Title>}
            styles={{ body: { padding: '24px' } }}
            style={{ borderColor: '#91caff', backgroundColor: '#e6f4ff', marginBottom: 24 }}
          >
            {!matchedSheet ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <Button type="primary" size="large" icon={<PlusOutlined />} onClick={handleOpenSheet}>
                  실전 성적 입력하기
                </Button>
                <div style={{ marginTop: 8, color: '#8c8c8c' }}>{filterYear}년도 {targetSheetPeriod} 성적 기록이 없습니다.</div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ textAlign: 'center' }}>
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>내신 점수</Typography.Text>
                    <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1677ff', lineHeight: 1 }}>
                      {matchedSheet.score}점
                    </div>
                  </div>
                  <div style={{ height: 40, width: 1, backgroundColor: '#d9d9d9' }} />
                  <div>
                    <Typography.Title level={5} style={{ margin: 0 }}>{matchedSheet.schoolName || '학교 정보 없음'}</Typography.Title>
                    <Typography.Text type="secondary">{matchedSheet.subject} | {filterYear}년 {targetSheetPeriod}</Typography.Text>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <Space style={{ marginRight: 16 }}>
                    {(matchedSheet.attachments || []).map(att => {
                      const fileUrl = att.path.startsWith('http') ? att.path : `/api${att.path}`;
                      return (
                        <a key={att.filename} href={fileUrl} target="_blank" rel="noopener noreferrer" title="성적표/시험지 보기">
                          {checkFileIsImage(att.filename) ? <PictureOutlined style={{fontSize: 28}} /> : <FilePdfOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />}
                        </a>
                      );
                    })}
                  </Space>
                  <Space>
                    <Button type="default" icon={<EditOutlined />} onClick={handleEditSheet}>수정</Button>
                    <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={handleDeleteSheet}>
                      <Button danger type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </div>
              </div>
            )}
            {matchedSheet?.memo && (
              <div style={{ marginTop: 16, padding: '12px', background: '#fff', borderRadius: 4, border: '1px solid #d9d9d9' }}>
                <Typography.Text strong style={{ fontSize: 12, color: '#8c8c8c', display: 'block', marginBottom: 4 }}>특이사항 메모</Typography.Text>
                <Typography.Text>{matchedSheet.memo}</Typography.Text>
              </div>
            )}
          </Card>
        </div>
      </Spin>

      {/* 3. 내신진도(1-7단계) 기록 모달 */}
      <Modal
        title={editingExamId ? '평가 결과 수정' : '평가 결과 간편 기록'}
        open={modalOpen}
        onOk={handleSaveRecord}
        onCancel={() => setModalOpen(false)}
        destroyOnClose
        width={400}
      >
        <Form form={form} layout="vertical" size="small">
          <Typography.Paragraph type="secondary">
            {activeCell?.examType === '학교기출' ? (
              <span>[유형] : 학교기출</span>
            ) : (
              <span>
                [단원] : {activeCell?.chapterName}<br/>
                [유형] : {activeCell?.examType}
              </span>
            )}
          </Typography.Paragraph>

          {activeCell?.examType === '학교기출' && (
            <Form.Item name="paperId" label="기출 시험지 연결 (선택)" style={{ marginBottom: 12 }}>
              <Select 
                placeholder="시험지 선택 (선택 시 기출년도, 학교명, 총 문항수 자동 연동)" 
                allowClear 
                onChange={(val) => {
                  if (!val) return;
                  const targetPaper = papers.find(p => p._id === val);
                  if (targetPaper) {
                    // 1. 기출년도 추출 (예: 2022 -> 22, 또는 파일명/제목에서 '22년' 추출)
                    let parsedYear = targetPaper.year;
                    if (parsedYear && parsedYear > 2000) {
                      parsedYear = parsedYear - 2000;
                    }
                    if (!parsedYear) {
                      const yMatch = targetPaper.title.match(/(\d{2,4})년/);
                      if (yMatch) {
                        let y = parseInt(yMatch[1], 10);
                        parsedYear = y > 2000 ? y - 2000 : y;
                      }
                    }

                    // 2. 학교명 추출
                    let parsedSchool = targetPaper.schoolName;
                    if (!parsedSchool) {
                      const sMatch = targetPaper.title.match(/([가-힣]+(?:중|여중|고|여고|초))/);
                      if (sMatch) parsedSchool = sMatch[1];
                    }

                    form.setFieldsValue({
                      year: parsedYear || undefined,
                      schoolName: parsedSchool || '',
                      totalQuestions: targetPaper.totalQuestions || undefined
                    });
                  }
                }}
              >
                {papers.filter(p => p.examType === '학교기출').map(p => (
                  <Select.Option key={p._id} value={p._id}>{p.title}</Select.Option>
                ))}
              </Select>
            </Form.Item>
          )}

          {activeCell?.examType === '학교기출' && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <Form.Item name="year" label="기출 년도" rules={[{ required: true, message: '기출 년도를 입력해주세요.' }]} style={{ flex: 1, marginBottom: 0 }}>
                <InputNumber min={0} max={99} style={{ width: '100%' }} placeholder="예: 24" />
              </Form.Item>
              <Form.Item name="schoolName" label="학교명" rules={[{ required: true, message: '학교명을 입력해주세요.' }]} style={{ flex: 1, marginBottom: 0 }}>
                <Input placeholder="예: 한영중" />
              </Form.Item>
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <Form.Item name="totalQuestions" label="총 문항수" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="문항수" />
            </Form.Item>
            <Form.Item name="correctCount" label="맞은 개수" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="개수" />
            </Form.Item>
            <Form.Item name="score" label="직접 점수" style={{ flex: 1, marginBottom: 0 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="점수" />
            </Form.Item>
          </div>

          <Form.Item name="examDate" label="푼 날짜" rules={[{ required: true }]}>
            <DatePicker style={{ width: '100%' }} format={DATE_FORMATS} />
          </Form.Item>

          <Form.Item name="memo" label="기타 메모(오답 이유 등)">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item label="학생 풀이지/결과지 첨부 (선택)">
            <Upload {...uploadProps} multiple>
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 4. 실전 내신성적(8단계) 기록 모달 */}
      <Modal
        title={editingSheetId ? '실전 내신성적 수정' : '실전 내신성적 기록'}
        open={sheetModalOpen}
        onOk={handleSaveSheet}
        onCancel={() => setSheetModalOpen(false)}
        destroyOnClose
        width={400}
      >
        <Form form={examSheetForm} layout="vertical" size="small">
          <Typography.Paragraph type="secondary">
            {filterYear}년도 {targetSheetPeriod} 고사 점수
          </Typography.Paragraph>

          <Space style={{ display: 'flex' }}>
            <Form.Item name="subject" label="과목" rules={[{ required: true }]} style={{ flex: 1 }}>
              <Input />
            </Form.Item>
            <Form.Item name="schoolName" label="학교명" style={{ flex: 1 }}>
              <Input placeholder="소속 학교" />
            </Form.Item>
          </Space>

          <Form.Item name="score" label="최종 점수" rules={[{ required: true, message: '점수를 입력해주세요.' }]}>
            <InputNumber min={0} max={100} style={{ width: '100%', fontSize: 20 }} placeholder="0 ~ 100" />
          </Form.Item>

          <Form.Item name="memo" label="특이사항 메모">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item label="성적표/시험지 실물 파일 첨부 (선택)">
            <Upload {...uploadProps} multiple>
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>

      {/* 5. 성과분석 리포트 모달 */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AreaChartOutlined style={{ color: '#2f54eb' }} />
            <span>{student?.name || '학생'} - 내신대비 성과분석 리포트</span>
          </div>
        }
        open={reportModalOpen}
        onCancel={() => setReportModalOpen(false)}
        footer={[
          <Button key="close" type="primary" onClick={() => setReportModalOpen(false)}>
            확인
          </Button>
        ]}
        width={800}
        destroyOnClose
      >
        {reportStats ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, padding: '12px 0' }}>
            {/* 상단 요약 배너 */}
            <div style={{ background: 'linear-gradient(135deg, #f0f5ff 0%, #d6e4ff 100%)', padding: '20px', borderRadius: 8, border: '1px solid #adc6ff' }}>
              <Typography.Title level={4} style={{ margin: '0 0 8px 0', color: '#1d39c4' }}>
                {filterYear}년 {filterSemester} {filterTerm}고사 대비 현황
              </Typography.Title>
              <Typography.Text type="secondary">
                풀이한 시험지 총 {reportStats.totalCount}건에 대한 상세 분석 결과 리포트입니다.
              </Typography.Text>
            </div>

            {/* 주요 지표 3개 카드 */}
            <Row gutter={16}>
              <Col span={8}>
                <Card bordered style={{ textAlign: 'center', background: '#fafafa' }}>
                  <Statistic 
                    title="전체 평균 점수" 
                    value={reportStats.avgScore} 
                    suffix="점"
                    valueStyle={{ color: '#1677ff', fontWeight: 'bold' }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Progress percent={reportStats.avgScore} size="small" showInfo={false} strokeColor="#1677ff" />
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card bordered style={{ textAlign: 'center', background: '#fafafa' }}>
                  <Statistic 
                    title="평가 통과율 (80점 이상)" 
                    value={reportStats.passRate} 
                    suffix="%"
                    valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <Progress percent={reportStats.passRate} size="small" showInfo={false} strokeColor="#52c41a" />
                  </div>
                </Card>
              </Col>
              <Col span={8}>
                <Card bordered style={{ textAlign: 'center', background: '#fafafa' }}>
                  <Statistic 
                    title="총 학습 완료 수" 
                    value={reportStats.totalCount} 
                    suffix="건"
                    valueStyle={{ color: '#722ed1', fontWeight: 'bold' }}
                  />
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: '12px', color: '#8c8c8c' }}>학습 이력 개수 기준</div>
                  </div>
                </Card>
              </Col>
            </Row>

            {/* 유형별 통계 상세 테이블 */}
            <Card title={<Space><SafetyCertificateOutlined style={{ color: '#52c41a' }} />유형별 성과 상태</Space>} size="small">
              <Table 
                dataSource={reportStats.typeStats}
                rowKey="type"
                pagination={false}
                size="small"
                columns={[
                  {
                    title: '평가 유형',
                    dataIndex: 'type',
                    key: 'type',
                    render: (v) => <Typography.Text strong>{v}</Typography.Text>
                  },
                  {
                    title: '풀이 횟수',
                    dataIndex: 'count',
                    key: 'count',
                    align: 'center',
                    render: (v) => v > 0 ? `${v}회` : <Tag color="default">미실시</Tag>
                  },
                  {
                    title: '평균 점수',
                    dataIndex: 'avgScore',
                    key: 'avgScore',
                    align: 'center',
                    render: (v, r) => r.count > 0 ? (
                      <Tag color={v >= 80 ? 'green' : v >= 60 ? 'orange' : 'red'} style={{ fontWeight: 'bold' }}>
                        {v}점
                      </Tag>
                    ) : '-'
                  },
                  {
                    title: '통과율 (80점↑)',
                    key: 'passRate',
                    width: 200,
                    render: (_, r) => r.count > 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Progress percent={r.passRate} size="small" strokeColor={r.passRate >= 80 ? '#52c41a' : '#fa8c16'} style={{ width: 120, margin: 0 }} />
                        <span>{r.passRate}%</span>
                      </div>
                    ) : '-'
                  }
                ]}
              />
            </Card>

            {/* 취약 단원 가이드 */}
            <Card title={<Space><AlertOutlined style={{ color: '#ff4d4f' }} />집중 강화 필요 단원 (평균 80점 미만)</Space>} size="small">
              {reportStats.weakChapters.length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#52c41a' }}>
                  <Typography.Text strong>🎉 모든 대단원 평균이 80점 이상입니다! 훌륭합니다.</Typography.Text>
                </div>
              ) : (
                <List 
                  dataSource={reportStats.weakChapters}
                  size="small"
                  renderItem={item => (
                    <List.Item extra={<Tag color="red" style={{ fontWeight: 'bold' }}>평균 {item.avgScore}점</Tag>}>
                      <List.Item.Meta
                        avatar={<BookOutlined style={{ color: '#8c8c8c', marginTop: 4 }} />}
                        title={<Typography.Text strong>{item.name}</Typography.Text>}
                        description="오답노트 복습 및 재시험을 권장합니다."
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </div>
        ) : (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#8c8c8c' }}>
            내신 준비 평가 기록이 아직 등록되지 않았습니다.
          </div>
        )}
      </Modal>

    </div>
  );
}
