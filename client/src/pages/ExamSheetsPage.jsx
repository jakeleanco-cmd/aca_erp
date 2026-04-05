import { useState } from 'react';
import { Typography, Tabs } from 'antd';
import {
  FileTextOutlined,
  FormOutlined,
  SolutionOutlined,
} from '@ant-design/icons';
import FormativeExamTab from './FormativeExamTab';
import ExamSheetsStudentTab from './ExamSheetsStudentTab';

/**
 * 성적 관리 메인 페이지
 * - 내신 성적: 기존 학교 내신 관리
 * - 형성평가: 학원 자체 평가 (레벨/과정/단원/내신/임의)
 * - 내신준비평가: 시험 대비 평가 (최다빈출, 서술형, 강남3구기출 등)
 */
export default function ExamSheetsPage() {
  const [activeTab, setActiveTab] = useState('formative');

  const items = [
    {
      key: 'formative',
      label: (
        <span>
          <FormOutlined style={{ marginRight: 6 }} />
          형성평가
        </span>
      ),
      children: <FormativeExamTab category="형성평가" />,
    },
    {
      key: 'midterm-prep',
      label: (
        <span>
          <SolutionOutlined style={{ marginRight: 6 }} />
          내신준비평가
        </span>
      ),
      children: <FormativeExamTab category="내신준비평가" />,
    },
  ];

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <Typography.Title level={4} style={{ margin: '0 0 4px 0' }}>
          평가 시험지 관리
        </Typography.Title>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          형성평가와 내신준비평가를 통합 관리합니다.
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
