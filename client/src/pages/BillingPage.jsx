import { useEffect, useState } from 'react';
import {
  Table, Button, DatePicker, message, Space, Tag,
  Typography, Popconfirm, Select, Form, InputNumber, Modal, Input,
} from 'antd';
import { CloseCircleOutlined, MessageOutlined, EditOutlined, DeleteOutlined, SearchOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import client from '../api/client';
import BillMessageModal from '../components/BillMessageModal';

const MONTH_FORMATS = ['YYYY.MM', 'YY.MM', 'YYYY-MM', 'YY-MM', 'YYYYMM', 'YYMM'];

export default function BillingPage() {
  const [month, setMonth] = useState(() => dayjs());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all');
  const [studentSearch, setStudentSearch] = useState('');
  const [billModalVisible, setBillModalVisible] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [students, setStudents] = useState([]);
  const [form] = Form.useForm();
  const [selectedBill, setSelectedBill] = useState(null);
  const [messageModalVisible, setMessageModalVisible] = useState(false);

  const yearMonth = month.format('YYYY-MM');

  const filteredRows = rows.filter((r) => {
    // 결제수단 필터
    if (paymentMethodFilter !== 'all') {
      if (paymentMethodFilter === '미결제' && r.paymentMethod) return false;
      if (paymentMethodFilter !== '미결제' && r.paymentMethod !== paymentMethodFilter) return false;
    }
    // 학생 이름 검색 필터
    if (studentSearch && !(r.student?.name || '').includes(studentSearch)) return false;
    return true;
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/bills', { params: { yearMonth } });
      setRows(data);
    } catch {
      message.error('고지 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    try {
      const { data } = await client.get('/students');
      setStudents(data);
    } catch {}
  };

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await client.post('/bills/generate', { yearMonth });
      message.success(data.message || data.created + '건 생성되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const cancelGeneration = async () => {
    setLoading(true);
    try {
      const { data } = await client.delete('/bills', { params: { yearMonth } });
      message.success(data.message || '삭제되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const deleteAll = async () => {
    setLoading(true);
    try {
      const { data } = await client.delete('/bills', { params: { yearMonth, includeAll: true } });
      message.success(data.message || '삭제되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const cancelPay = async (id) => {
    try {
      await client.post('/bills/' + id + '/cancel-pay');
      message.success('납부가 취소되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '납부 취소에 실패했습니다.');
    }
  };

  const payCard = async (id) => {
    try {
      await client.post('/bills/' + id + '/pay-card');
      message.success('카드 수납 처리되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  const payCash = async (row) => {
    try {
      await client.post('/bills/' + row._id + '/pay-cash');
      message.success('현금 수납 처리되었습니다.');
      // 현금영수증 사용 학생이면 발행 필요 안내
      if (row.cashReceiptUse !== '미사용') {
        message.warning({
          content: `${row.student?.name || '학생'}님은 현금영수증 발행이 필요합니다. (${row.externalReceiptId || '번호 미등록'})`,
          duration: 5,
        });
      }
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  const updateAmount = async (id, amount) => {
    try {
      await client.patch('/bills/' + id, { amount });
      message.success('금액이 수정되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '금액 수정에 실패했습니다.');
    }
  };

  const issueReceipt = async (row) => {
    try {
      await client.post('/bills/' + row._id + '/issue-receipt', {});
      message.success('현금영수증 발행이 기록되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '기록에 실패했습니다.');
    }
  };

  const cancelReceipt = async (row) => {
    try {
      await client.post('/bills/' + row._id + '/cancel-receipt');
      message.success('현금영수증 발행이 취소되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '발행 취소에 실패했습니다.');
    }
  };

  const deleteBill = async (id) => {
    try {
      await client.delete('/bills/' + id);
      message.success('고지가 삭제되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '삭제 실패');
    }
  };

  const openAddBill = async () => {
    setEditingBill(null);
    await loadStudents();
    form.resetFields();
    setBillModalVisible(true);
  };

  const openEditBill = async (record) => {
    setEditingBill(record);
    await loadStudents();
    form.setFieldsValue({
      studentId: record.student?._id,
      amount: record.amount,
      externalReceiptId: record.externalReceiptId || '',
      cashReceiptUse: record.cashReceiptUse || '사용',
    });
    setBillModalVisible(true);
  };

  const handleBillSave = async () => {
    try {
      const vals = await form.validateFields();
      if (editingBill) {
        await client.put('/bills/' + editingBill._id, {
          amount: vals.amount,
          externalReceiptId: vals.externalReceiptId,
          cashReceiptUse: vals.cashReceiptUse,
        });
        message.success('고지가 수정되었습니다.');
      } else {
        await client.post('/bills', { yearMonth, studentId: vals.studentId, amount: vals.amount });
        message.success('고지가 추가되었습니다.');
      }
      await load();
      setBillModalVisible(false);
    } catch (err) {
      message.error(err.response?.data?.message || '처리 실패');
    }
  };

  useEffect(() => {
    load();
  }, [yearMonth]);

  const columns = [
    {
      title: '학생',
      key: 'name',
      width: 80,
      render: (_, r) => r.student?.name || '-',
    },
    {
      title: '금액',
      dataIndex: 'amount',
      width: 110,
      render: (v, r) => (
        <Typography.Text
          editable={r.status === '미납' ? { onChange: (newVal) => updateAmount(r._id, newVal), tooltip: '금액 수정' } : false}
          style={{ whiteSpace: 'nowrap' }}
        >
          {Number(v).toLocaleString()}원
        </Typography.Text>
      ),
    },
    {
      title: '상태',
      dataIndex: 'status',
      width: 120,
      render: (s, r) => (
        <Space size={4} align="center">
          {s === '납부완료' ? <Tag color="green">{s}</Tag> : <Tag color="orange">{s}</Tag>}
          {s === '납부완료' && !r.receiptIssued && (
            <Popconfirm title="납부를 취소하시겠습니까?" onConfirm={() => cancelPay(r._id)} okText="네, 취소합니다" cancelText="아니오" okButtonProps={{ danger: true }}>
              <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }} />
            </Popconfirm>
          )}
        </Space>
      ),
    },
    {
      title: '결제수단',
      dataIndex: 'paymentMethod',
      width: 95,
      render: (m) => m || '-',
    },
    {
      title: '현금영수증',
      key: 'rc',
      width: 150,
      render: (_, r) => {
        // 현금영수증 사용여부 태그
        const useTag = r.cashReceiptUse === '미사용'
          ? <Tag color="default">미사용</Tag>
          : <Tag color="blue">사용</Tag>;
        // 현금영수증 번호 (학생 정보에서 복사된 값)
        const phoneNum = r.externalReceiptId || '-';
        // 발행 여부
        const issued = r.receiptIssued
          ? <span style={{ fontSize: 11, color: '#52c41a' }}>{r.receiptIssuedAt ? dayjs(r.receiptIssuedAt).format('MM-DD') + ' 발행' : '발행완료'}</span>
          : null;
        return (
          <Space direction="vertical" size={0} style={{ lineHeight: 1.4 }}>
            <Space size={4}>{useTag}<span style={{ fontSize: 12 }}>{phoneNum}</span></Space>
            {issued}
          </Space>
        );
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 220,
      render: (_, r) => (
        <Space wrap size="small">
          <Button size="small" icon={<MessageOutlined />} onClick={() => { setSelectedBill(r); setMessageModalVisible(true); }}>
            안내문
          </Button>
          {r.status === '미납' && (
            <>
              <Button size="small" type="primary" onClick={() => payCard(r._id)}>카드</Button>
              {/* 현금영수증 사용 학생은 확인 후 현금 수납 처리 */}
              {r.cashReceiptUse !== '미사용' ? (
                <Popconfirm
                  title="현금영수증 발행 필요"
                  description={`현금영수증 번호: ${r.externalReceiptId || '미등록'}\n현금 수납 처리하시겠습니까?`}
                  onConfirm={() => payCash(r)}
                  okText="네, 수납"
                  cancelText="취소"
                >
                  <Button size="small">현금</Button>
                </Popconfirm>
              ) : (
                <Button size="small" onClick={() => payCash(r)}>현금</Button>
              )}
            </>
          )}
          {/* 현금 납부완료 + 현금영수증 사용 + 미발행 → 발행완료 기록 버튼 표시 */}
          {r.status === '납부완료' && r.paymentMethod === '현금' && r.cashReceiptUse !== '미사용' && !r.receiptIssued && (
            <Popconfirm
              title="현금영수증 발행완료 기록"
              description="현금영수증을 실제로 발행한 후 이 버튼을 눌러주세요."
              onConfirm={() => issueReceipt(r)}
              okText="발행 완료"
              cancelText="취소"
            >
              <Button size="small" type="dashed" icon={<CheckCircleOutlined />}>발행완료</Button>
            </Popconfirm>
          )}
          {/* 현금영수증 발행된 건 → 발행취소 버튼 표시 */}
          {r.status === '납부완료' && r.paymentMethod === '현금' && r.receiptIssued && (
            <Popconfirm
              title="현금영수증 발행 취소"
              description="발행 기록을 취소하시겠습니까?"
              onConfirm={() => cancelReceipt(r)}
              okText="네, 취소"
              cancelText="아니오"
              okButtonProps={{ danger: true }}
            >
              <Button size="small" danger type="text">발행취소</Button>
            </Popconfirm>
          )}
          <Button size="small" type="text" icon={<EditOutlined />} onClick={() => openEditBill(r)} />
          <Popconfirm title="정말 삭제하시겠습니까?" onConfirm={() => deleteBill(r._id)}>
            <Button size="small" danger type="text" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 12 }} wrap>
        <Button type="primary" size="small" onClick={openAddBill}>고지 추가</Button>
        <Button onClick={generate} loading={loading}>고지 생성</Button>
        <Button onClick={cancelGeneration} loading={loading}>미납 삭제</Button>
        <Button onClick={deleteAll} loading={loading}>전체 삭제</Button>
      </Space>

      <Typography.Title level={4}>월별 수납</Typography.Title>

      <Space style={{ marginBottom: 16 }} wrap align="center" size={[8, 12]}>
        <span>대상 월:</span>
        <DatePicker picker="month" format={MONTH_FORMATS} value={month} onChange={(d) => d && setMonth(d)} allowClear={false} />
        <span style={{ marginLeft: 8 }}>결제수단:</span>
        <Select
          value={paymentMethodFilter}
          onChange={setPaymentMethodFilter}
          style={{ width: 100 }}
          options={[
            { value: 'all', label: '전체' },
            { value: '카드', label: '카드' },
            { value: '현금', label: '현금' },
            { value: '미결제', label: '미결제' },
          ]}
        />
        <Input
          placeholder="학생 이름 검색"
          prefix={<SearchOutlined />}
          value={studentSearch}
          onChange={(e) => setStudentSearch(e.target.value)}
          allowClear
          style={{ width: 160 }}
        />
      </Space>

      <div style={{ marginBottom: 20, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>총 고지 금액</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18 }}>{filteredRows.reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()}원</Typography.Text>
        </div>
        <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch' }} />
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>납부 완료</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18, color: '#52c41a' }}>{filteredRows.filter((r) => r.status === '납부완료').reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()}원</Typography.Text>
        </div>
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>미납 금액</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18, color: '#faad14' }}>{filteredRows.filter((r) => r.status === '미납').reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()}원</Typography.Text>
        </div>
      </div>

      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
        「고지 생성」은 해당 월에 아직 고지가 없는 재원 학생에게만 월수강료를 복사해 고지서를 만듭니다. 현금 수납 후 「현금영수증 발행」으로 발행 이력을 남깁니다.
      </Typography.Paragraph>

      <Table rowKey="_id" loading={loading} columns={columns} dataSource={filteredRows} pagination={{ pageSize: 30 }} scroll={{ x: 850 }} size="small" />

      <Modal title={editingBill ? '고지 수정' : '고지 추가'} open={billModalVisible} onOk={handleBillSave} onCancel={() => setBillModalVisible(false)} destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="studentId" label="학생" rules={[{ required: true, message: '학생을 선택하세요' }]}>
            <Select showSearch optionFilterProp="label" disabled={!!editingBill} options={students.map((s) => ({ label: s.name, value: s._id }))} placeholder="학생을 선택하세요" />
          </Form.Item>
          <Form.Item name="amount" label="금액" rules={[{ required: true, message: '금액을 입력하세요' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          {editingBill && (
            <>
              <Form.Item name="cashReceiptUse" label="현금영수증 사용여부">
                <Select options={[{ value: '사용', label: '사용' }, { value: '미사용', label: '미사용' }]} />
              </Form.Item>
              <Form.Item name="externalReceiptId" label="현금영수증 번호">
                <Input placeholder="현금영수증 번호를 입력하세요" />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>

      <BillMessageModal visible={messageModalVisible} bill={selectedBill} onClose={() => { setMessageModalVisible(false); setSelectedBill(null); }} />
    </div>
  );
}
