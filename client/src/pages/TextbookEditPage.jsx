import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Select, Button, Card, message, Spin, Switch, Space, Divider } from 'antd';
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
    <Card title={isNew ? '교재 등록' : '교재 수정'}>
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 850 }}>
        {/* 기본 정보 영역 */}
        <Space size="large" style={{ display: 'flex', marginBottom: 16 }}>
          <Form.Item name="publishYear" label="출판년도" rules={[{ required: true }]}>
            <InputNumber min={1990} max={2100} />
          </Form.Item>
          <Form.Item name="schoolLevel" label="학년구분" rules={[{ required: true }]} style={{ width: 120 }}>
            <Select options={SCHOOL_LEVELS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
          <Form.Item name="gradeLabel" label="학년/학기" rules={[{ required: true }]}>
            <Input placeholder="예: 1학년 1학기" />
          </Form.Item>
          <Form.Item name="learningLevel" label="학습수준" rules={[{ required: true }]} style={{ width: 120 }}>
            <Select options={TEXTBOOK_LEVELS.map((v) => ({ value: v, label: v }))} />
          </Form.Item>
        </Space>

        <Form.Item name="title" label="교재명" rules={[{ required: true }]}>
          <Input placeholder="교재 이름을 입력하세요" />
        </Form.Item>

        <Divider orientation="left">단원 및 소주제 구성</Divider>

        {/* 중단원(Chapters) 리스트 */}
        <Form.List name="chapters">
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }, index) => (
                <Card
                  key={key}
                  type="inner"
                  size="small"
                  title={`${index + 1}단원`}
                  extra={<MinusCircleOutlined onClick={() => remove(name)} />}
                  style={{ marginBottom: 16, backgroundColor: '#fafafa' }}
                >
                  <Space align="baseline" style={{ display: 'flex', marginBottom: 16 }}>
                    <Form.Item {...restField} name={[name, 'order']} rules={[{ required: true }]} initialValue={index + 1}>
                      <InputNumber placeholder="순서" />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'title']} rules={[{ required: true, message: '단원명을 입력하세요' }]}>
                      <Input placeholder="단원명 (예: 소인수분해)" style={{ width: 300 }} />
                    </Form.Item>
                    <Form.Item {...restField} name={[name, 'hasUnitEvaluation']} valuePropName="checked">
                      <Switch checkedChildren="단원평가 있음" unCheckedChildren="평가 없음" />
                    </Form.Item>
                  </Space>

                  {/* 소주제(Topics) 중첩 리스트 */}
                  <div style={{ paddingLeft: 24, borderLeft: '2px solid #eee' }}>
                    <Form.List name={[name, 'topics']}>
                      {(subFields, { add: addTopic, remove: removeTopic }) => (
                        <>
                          {subFields.map(({ key: subKey, name: subName, ...subRestField }, subIndex) => (
                            <Space key={subKey} align="baseline" style={{ display: 'flex', marginBottom: 4 }}>
                              <Form.Item {...subRestField} name={[subName, 'order']} initialValue={subIndex + 1}>
                                <InputNumber size="small" style={{ width: 50 }} />
                              </Form.Item>
                              <Form.Item {...subRestField} name={[subName, 'title']} rules={[{ required: true, message: '소주제명' }]}>
                                <Input size="small" placeholder="소주제명 입력" style={{ width: 350 }} />
                              </Form.Item>
                              <MinusCircleOutlined onClick={() => removeTopic(subName)} style={{ color: '#ff4d4f' }} />
                            </Space>
                          ))}
                          <Button
                            type="dashed"
                            size="small"
                            onClick={() => addTopic({ order: subFields.length + 1, title: '' })}
                            icon={<PlusOutlined />}
                          >
                            소주제 추가
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </div>
                </Card>
              ))}
              <Button type="primary" ghost onClick={() => add({ order: fields.length + 1, title: '', topics: [] })} block icon={<PlusOutlined />}>
                새 단원 추가
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