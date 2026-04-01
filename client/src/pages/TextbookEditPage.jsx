import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Select, Button, Card, message, Spin, Switch, Space, Divider, Typography } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import client from '../api/client';
import { SCHOOL_LEVELS, TEXTBOOK_LEVELS } from '../constants/learning';

export default function TextbookEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(!isNew);

  useEffect(() => {
    if (isNew) {
      // 초기값 설정: 1단원, 1소주제 포함
      form.setFieldsValue({
        chapters: [{ order: 1, title: '', topics: [{ order: 1, title: '' }], hasUnitEvaluation: false }]
      });
      return;
    }
    (async () => {
      try {
        const { data } = await client.get(`/textbooks/${id}`);
        // 스키마가 이미 객체 배열이므로 문자열 변환 로직 제거
        form.setFieldsValue(data);
      } catch {
        message.error('교재를 불러오지 못했습니다.');
        navigate('/textbooks');
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isNew, form, navigate]);

  const onFinish = async (values) => {
    // 폼 데이터 가공 (공백 제거 등)
    const payload = {
      ...values,
      chapters: (values.chapters || []).map((ch) => ({
        ...ch,
        topics: (ch.topics || []).filter(t => t.title?.trim()) // 제목 없는 토픽 제외
      }))
    };

    try {
      if (isNew) {
        const { data } = await client.post('/textbooks', payload);
        message.success('등록되었습니다.');
        navigate(`/textbooks/${data._id}`);
      } else {
        await client.put(`/textbooks/${id}`, payload);
        message.success('저장되었습니다.');
      }
    } catch (err) {
      message.error(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 48 }}><Spin /></div>;

  return (
    <Card title={isNew ? '교재 등록' : '교재 수정'} bordered={false}>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 900 }}>
        {/* 기본 정보 영역 - 한 줄에 너무 많이 넣지 않음 */}
        <div style={{ 
          display: 'flex', 
          flexWrap: 'wrap', 
          gap: '16px', 
          marginBottom: 16,
          background: 'rgba(0,0,0,0.02)',
          padding: '16px',
          borderRadius: '8px'
        }}>
          <Form.Item name="publishYear" label="출판년도" rules={[{ required: true }]} style={{ width: '120px', margin: 0 }}>
            <InputNumber min={1990} max={2100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="schoolLevel" label="학년구분" rules={[{ required: true }]} style={{ width: '120px', margin: 0 }}>
            <Select options={SCHOOL_LEVELS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="gradeLabel" label="학년/학기" rules={[{ required: true }]} style={{ width: '180px', margin: 0 }}>
            <Input placeholder="예: 1학년 1학기" />
          </Form.Item>
          <Form.Item name="learningLevel" label="학습수준" rules={[{ required: true }]} style={{ width: '120px', margin: 0 }}>
            <Select options={TEXTBOOK_LEVELS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="title" label="교재명" rules={[{ required: true }]} style={{ flex: '1 1 250px', margin: 0 }}>
            <Input placeholder="교재 이름을 입력하세요" />
          </Form.Item>
        </div>

        <Divider orientation="left" style={{ margin: '24px 0 16px' }}>단원 및 소주제 구성</Divider>

        {/* 중단원(Chapters) 리스트 */}
        <Form.List name="chapters">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  key={key}
                  size="small"
                  title={<span style={{ fontWeight: 700 }}>{index + 1}단원 설정</span>}
                  extra={<Button type="text" danger icon={<MinusCircleOutlined />} onClick={() => remove(name)} />}
                  style={{ 
                    marginBottom: 20, 
                    border: '1px solid #e8e8e8',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}
                  headStyle={{ background: 'rgba(0,0,0,0.03)' }}
                >
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: 16, alignItems: 'flex-end' }}>
                    <Form.Item 
                      {...restField} 
                      name={[name, 'order']} 
                      label="순서"
                      rules={[{ required: true }]} 
                      initialValue={index + 1}
                      style={{ width: '70px', margin: 0 }}
                    >
                      <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item 
                      {...restField} 
                      name={[name, 'title']} 
                      label="단원명"
                      rules={[{ required: true, message: '단원명을 입력하세요' }]}
                      style={{ flex: '1 1 300px', margin: 0 }}
                    >
                      <Input placeholder="단원명 (예: 소인수분해)" />
                    </Form.Item>
                    <Form.Item 
                      {...restField} 
                      name={[name, 'hasUnitEvaluation']} 
                      valuePropName="checked"
                      style={{ margin: 0, paddingBottom: '4px' }}
                    >
                      <Switch checkedChildren="단원평가 있음" unCheckedChildren="평가 없음" />
                    </Form.Item>
                  </div>

                  {/* 소주제(Topics) 중첩 리스트 */}
                  <div style={{ 
                    padding: '16px', 
                    background: 'rgba(0,0,0,0.01)', 
                    borderRadius: '6px',
                    borderLeft: '4px solid #1890ff' 
                  }}>
                    <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: '12px', fontWeight: 600 }}>
                      └ 소주제 리스트
                    </Typography.Text>
                    <Form.List name={[name, 'topics']}>
                      {(subFields, { add: addTopic, remove: removeTopic }) => (
                        <>
                          {subFields.map(({ key: subKey, name: subName, ...subRestField }, subIndex) => (
                            <div key={subKey} style={{ display: 'flex', gap: '8px', marginBottom: 8, alignItems: 'center' }}>
                              <Form.Item {...subRestField} name={[subName, 'order']} initialValue={subIndex + 1} style={{ margin: 0 }}>
                                <InputNumber size="small" style={{ width: '45px' }} />
                              </Form.Item>
                              <Form.Item 
                                {...subRestField} 
                                name={[subName, 'title']} 
                                rules={[{ required: true, message: '소주제명' }]}
                                style={{ flex: '1 1 auto', margin: 0 }}
                              >
                                <Input size="small" placeholder="세부 소주제명 입력" />
                              </Form.Item>
                              <Button 
                                type="text" 
                                size="small" 
                                danger 
                                icon={<MinusCircleOutlined />} 
                                onClick={() => removeTopic(subName)} 
                              />
                            </div>
                          ))}
                          <Button
                            type="dashed"
                            size="small"
                            onClick={() => addTopic({ order: subFields.length + 1, title: '' })}
                            icon={<PlusOutlined />}
                            style={{ marginTop: 8 }}
                          >
                            소주제 추가
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </div>
                </Card>
              ))}
              <Button 
                type="dashed" 
                onClick={() => add({ order: fields.length + 1, title: '', topics: [] })} 
                block 
                icon={<PlusOutlined />}
                style={{ height: '45px', borderRadius: '8px' }}
              >
                새로운 단원 추가하기
              </Button>
            </>
          )}
        </Form.List>

        <Form.Item style={{ marginTop: 24 }}>
          <Space>
            <Button type="primary" htmlType="submit" size="large">저장하기</Button>
            <Button onClick={() => navigate('/textbooks')} size="large">취소</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
}