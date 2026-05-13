import React, { useEffect, useState } from 'react';
import { Typography, Form, Input, Button, message, Card, Space, Select, Divider, List, Popconfirm } from 'antd';
import { PlusOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import client from '../api/client';

const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

const WEEKDAYS = [
  { label: '월', value: 0 },
  { label: '화', value: 1 },
  { label: '수', value: 2 },
  { label: '목', value: 3 },
  { label: '금', value: 4 },
  { label: '토', value: 5 },
  { label: '일', value: 6 },
];

const DEFAULT_BANK = '농협 은행 356-1481-8505-13 (이장원)';

export default function SettingsPage() {
  const [form] = Form.useForm();
  const [templates, setTemplates] = useState([]);
  const [bankAccount, setBankAccount] = useState(DEFAULT_BANK);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/settings/bill_message_config_v2');
      if (data && data.value) {
        setTemplates(data.value.templates || []);
        setBankAccount(data.value.bankAccount || DEFAULT_BANK);
      }
    } catch (err) {
      message.error('설정을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (newTemplates, newBank) => {
    setLoading(true);
    try {
      await client.post('/settings', {
        key: 'bill_message_config_v2',
        value: {
          templates: newTemplates,
          bankAccount: newBank,
        },
        description: '요일별 수강료 안내 메시지 템플릿 설정 (v2)',
      });
      message.success('설정이 저장되었습니다.');
      await load();
    } catch (err) {
      message.error('설정 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const addTemplate = () => {
    const newTemplates = [
      ...templates,
      {
        id: Date.now(),
        label: '새 템플릿',
        weekdays: [],
        content: `안녕하세요. \n이장원수학교습소입니다.\n\n{{grade}} {{name}}\n3월 수업 ( 3/5~3/31 ) 안내 드립니다.\n2시간씩 8회 기준 {{level}}부 {{amount}}원이고 \n화목 8회 수업 예정입니다.\n수업료 {{amount}}원입니다.\n\n학생 이름으로 입금 부탁드립니다.\n{{bankAccount}} 입니다.`,
        isDefault: templates.length === 0,
      },
    ];
    setTemplates(newTemplates);
  };

  const removeTemplate = (id) => {
    const newTemplates = templates.filter((t) => t.id !== id);
    setTemplates(newTemplates);
  };

  const updateTemplate = (id, fields) => {
    const newTemplates = templates.map((t) => (t.id === id ? { ...t, ...fields } : t));
    setTemplates(newTemplates);
  };

  const handleSaveAll = () => {
    save(templates, bankAccount);
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>안내 메시지 설정</Title>
        <Button type="primary" size="large" onClick={handleSaveAll} loading={loading}>
          모든 설정 저장하기
        </Button>
      </div>

      <Card title="공통 설정" style={{ marginBottom: 24, borderRadius: 12 }}>
        <Form layout="vertical">
          <Form.Item label="기본 입금 계좌 정보" required>
            <Input 
              value={bankAccount} 
              onChange={(e) => setBankAccount(e.target.value)} 
              placeholder="예: 농협 000-0000-0000 (이장원)"
            />
          </Form.Item>
        </Form>
      </Card>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={5} style={{ margin: 0 }}>요일별 템플릿 목록</Title>
        <Button icon={<PlusOutlined />} onClick={addTemplate}>템플릿 추가</Button>
      </div>

      <List
        grid={{ gutter: 16, column: 1 }}
        dataSource={templates}
        renderItem={(item) => (
          <List.Item>
            <Card 
              size="small"
              title={
                <Input 
                  variant="borderless" 
                  value={item.label} 
                  onChange={(e) => updateTemplate(item.id, { label: e.target.value })}
                  style={{ fontWeight: 600, padding: 0 }}
                />
              }
              extra={
                <Space>
                  <Button 
                    type={item.isDefault ? "primary" : "default"} 
                    size="small"
                    onClick={() => {
                      const updated = templates.map(t => ({ ...t, isDefault: t.id === item.id }));
                      setTemplates(updated);
                    }}
                  >
                    {item.isDefault ? "기본 설정됨" : "기본으로 설정"}
                  </Button>
                  <Popconfirm title="템플릿을 삭제하시겠습니까?" onConfirm={() => removeTemplate(item.id)}>
                    <Button icon={<DeleteOutlined />} danger size="small" />
                  </Popconfirm>
                </Space>
              }
              style={{ borderRadius: 12, border: '1px solid rgba(255, 255, 255, 0.1)' }}
            >
              <Form layout="vertical">
                <Form.Item 
                  label="대상 요일" 
                  extra="학생의 수업 요일과 일치할 때 이 템플릿이 우선 적용됩니다."
                >
                  <Select
                    mode="multiple"
                    placeholder="요일 선택"
                    value={item.weekdays}
                    onChange={(val) => updateTemplate(item.id, { weekdays: val })}
                    style={{ width: '100%' }}
                    options={WEEKDAYS}
                  />
                </Form.Item>
                <Form.Item label="메시지 내용">
                  <TextArea 
                    value={item.content}
                    onChange={(e) => updateTemplate(item.id, { content: e.target.value })}
                    autoSize={{ minRows: 10 }}
                    style={{ fontFamily: 'inherit', lineHeight: '1.6' }}
                  />
                </Form.Item>
              </Form>
            </Card>
          </List.Item>
        )}
      />

      <div style={{ marginTop: 24, padding: '16px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: 8 }}>
        <Space><InfoCircleOutlined /><Text strong>안내 및 팁</Text></Space>
        <ul style={{ marginTop: 8, paddingLeft: 20, color: 'rgba(255, 255, 255, 0.65)', fontSize: '13px' }}>
          <li>휴강일 등으로 인해 매달 수업 날짜가 달라지므로, <b>수업 기간과 횟수는 각 템플릿 본문에 직접 입력(하드코딩)</b>하여 관리하는 것을 권장합니다.</li>
          <li>매달 말일 안내 전, 이곳에서 이번 달 요일별 수업 정보를 한 번만 수정해두면 모든 학생에게 일괄 적용됩니다.</li>
          <li>치환자 활용: <code>{'{{name}}'}</code>(이름), <code>{'{{grade}}'}</code>(학년), <code>{'{{month}}'}</code>(월), <code>{'{{amount}}'}</code>(금액), <code>{'{{level}}'}</code>(초/중/고), <code>{'{{bankAccount}}'}</code>(계좌)</li>
        </ul>
      </div>
    </div>
  );
}
