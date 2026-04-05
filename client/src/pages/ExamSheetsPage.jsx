import { useState } from 'react';
import { Typography, Tabs } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  SolutionOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import FormativeExamTab from './FormativeExamTab';
import ExamPaperPage from './ExamPaperPage';
import ExamSheetsDashboardTab from './ExamSheetsDashboardTab';

/**
 * 성적 관리 메인 페이지 (4탭 구조)
 * 1. 형성평가: 학원 자체 평가
 * 2. 내신준비평가: 시험 대비 평가
 * 3. 내신 성적 대시보드: 기존 학교 내신 관리
 * 4. 시험지 보관함: 마스터 시험지 관리 (NEW)
 */
export default function ExamSheetsPage() {
  const [activeTab, setActiveTab] = useState('formative');

  const items = [
    {
      key: 'formative',
      label: (
        <span>
          <FormOutlined style={{ marginRight: 6 }} />
          형성평가 기록
        </span>
      ),
      children: <FormativeExamTab category="형성평가" />,
    },
    {
      key: 'midterm-prep',
      label: (
        <span>
          <SolutionOutlined style={{ marginRight: 6 }} />
          내신준비 기록
        </span>
      ),
      children: <FormativeExamTab category="내신준비평가" />,
    },
    {
      key: 'school-exam',
      label: (
        <span>
          <FileTextOutlined style={{ marginRight: 6 }} />
          학교 내신 관리
        </span>
      ),
      children: <ExamSheetsDashboardTab />,
    },
    {
      key: 'exam-papers',
      label: (
        <span>
          <FolderOpenOutlined style={{ marginRight: 6 }} />
          시험지 보관함
        </span>
      ),
      children: <ExamPaperPage />,
    },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: '0 0 4px 0' }}>
          평가 시험지 및 성적 관리
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          학원 자체 평가와 학교 내신 성적을 통합 관리합니다.
        </Typography.Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={items}
        size="small"
        style={{ marginTop: 8 }}
      />
    </div>
  );
}
