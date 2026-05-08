import React, { useState, useEffect, useMemo } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, InputNumber,
  Space, Typography, Tag, Popconfirm, message, DatePicker, Upload, Spin, Row, Col, Card
} from 'antd';
import { 
  PlusOutlined, EditOutlined, 
  UploadOutlined, FilePdfOutlined, PictureOutlined, DeleteOutlined
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

  // --- Handlers for FormativeExam (1~7단계) ---
  const handleOpenRecord = (chapterName, examType, paper) => {
    setActiveCell({ chapterName, examType, paperId: paper?._id, totalQuestions: paper?.totalQuestions });
    form.resetFields();
    form.setFieldsValue({
      examDate: dayjs(),
      correctCount: null,
      score: null,
      schoolName: '',
      memo: ''
    });
    setFileList([]);
    setEditingExamId(null);
    setModalOpen(true);
  };

  const handleEditRecord = (record) => {
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
      memo: record.memo,
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
      formData.append('title', activeCell.chapterName);
      formData.append('chapterName', activeCell.chapterName);
      formData.append('student', studentId);
      formData.append('schoolLevel', filterLevel);
      formData.append('gradeLabel', filterGrade);
      formData.append('semester', filterSemester);
      formData.append('examPeriod', filterTerm); 
      formData.append('examDate', vals.examDate.toISOString());
      
      if (activeCell.paperId) formData.append('examPaper', activeCell.paperId);
      if (activeCell.totalQuestions) formData.append('totalQuestions', activeCell.totalQuestions);
      if (vals.correctCount !== undefined && vals.correctCount !== null) formData.append('correctCount', vals.correctCount);
      if (vals.score !== undefined && vals.score !== null) formData.append('score', vals.score);
      if (vals.schoolName) formData.append('schoolName', vals.schoolName);
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

  const checkPassed = (rec) => {
    if (!rec) return false;
    if (rec.totalQuestions > 0 && rec.correctCount !== undefined && rec.correctCount !== null) {
      return (rec.correctCount / rec.totalQuestions) >= 0.8;
    }
    return (rec.score || 0) >= 80;
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

      return (
        <div key={rec._id} style={{ marginBottom: 4 }}>
          <Space size="small">
             <Tag 
               color={passed ? 'green' : isBad ? 'red' : 'orange'} 
               style={{ cursor: 'pointer', margin: 0 }}
               onClick={() => handleEditRecord(rec)}
             >
               {idx > 0 ? '[재시험] ' : ''}
               {isMultiMode && rec.schoolName ? `${rec.schoolName}: ` : ''}{displayScore}
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
      const res = await client.post('/exam-papers/sync-local');
      message.success(`동기화 완료: ${res.data.successCount}개 추가, ${res.data.skipCount}개 건너뜀`);
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
          <Button onClick={handleSyncExams} type="primary" loading={loading}>시험지 갱신</Button>
        </div>
      </Card>

      {/* 2. 유형별 리스트 뷰 */}
      <Spin spinning={loading}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {MIDTERM_PREP_EXAM_TYPES.map((type, idx) => {
            const filteredChapters = chapters
              .filter(c => hasData(c, type))
              .map(c => ({ key: c, chapterName: c }));

            if (filteredChapters.length === 0) return null;

            return (
              <Card 
                key={type} 
                title={<Typography.Title level={5} style={{ margin: 0 }}>{idx + 1}. {type}</Typography.Title>}
                size="small"
                styles={{ body: { padding: 0 } }}
              >
                <Table 
                  dataSource={filteredChapters}
                  pagination={false}
                  size="small"
                  bordered
                  tableLayout="fixed"
                  columns={[
                    { 
                      title: '단원명', 
                      dataIndex: 'chapterName', 
                      width: 200,
                      render: (v) => <Typography.Text strong>{v}</Typography.Text>
                    },
                    { 
                      title: '시험지 및 평가 기록', 
                      render: (_, record) => renderCellContent(record.chapterName, type) 
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
            [단원] : {activeCell?.chapterName}<br/>
            [유형] : {activeCell?.examType}
          </Typography.Paragraph>

          {activeCell?.examType === '학교기출' && (
            <Form.Item name="schoolName" label="학교명" rules={[{ required: true, message: '학교기출은 학교명을 입력해주세요.' }]}>
              <Input placeholder="예: 한영중" />
            </Form.Item>
          )}

          <Space style={{ display: 'flex' }}>
            <Form.Item name="correctCount" label={`맞은 개수 (총 ${activeCell?.totalQuestions || '?'}문항)`} style={{ flex: 1 }}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="개수" />
            </Form.Item>
            <Form.Item name="score" label="또는 직접 백분율 점수" style={{ flex: 1 }}>
              <InputNumber min={0} max={100} style={{ width: '100%' }} placeholder="점수" />
            </Form.Item>
          </Space>

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

    </div>
  );
}
