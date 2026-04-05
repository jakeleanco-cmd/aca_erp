import { useEffect, useState } from 'react';
import { Table, Button, DatePicker, message, Space, Tag, Typography, Popconfirm } from 'antd';
import dayjs from 'dayjs';
import { CloseCircleOutlined } from '@ant-design/icons';
import client from '../api/client';

export default function BillingPage() {
  const [month, setMonth] = useState(() => dayjs());
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);

  const yearMonth = month.format('YYYY-MM');

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

  useEffect(() => {
    load();
  }, [yearMonth]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data } = await client.post('/bills/generate', { yearMonth });
      message.success(data.message || `${data.created}건 생성되었습니다.`);
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 미납 고지서만 삭제
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

  // 납부완료 포함 전체 고지서 삭제
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
      await client.post(`/bills/${id}/cancel-pay`);
      message.success('납부가 취소되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '납부 취소에 실패했습니다.');
    }
  };

  const payCard = async (id) => {
    try {
      await client.post(`/bills/${id}/pay-card`);
      message.success('카드 수납 처리되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  const payCash = async (id) => {
    try {
      await client.post(`/bills/${id}/pay-cash`);
      message.success('현금 수납 처리되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '처리에 실패했습니다.');
    }
  };

  const updateAmount = async (id, amount) => {
    try {
      await client.patch(`/bills/${id}`, { amount });
      message.success('금액이 수정되었습니다.');
      await load(); // 목록과 상단 합계를 새로고침
    } catch (err) {
      message.error(err.response?.data?.message || '금액 수정에 실패했습니다.');
    }
  };

  const issueReceipt = async (row) => {
    try {
      await client.post(`/bills/${row._id}/issue-receipt`, {});
      message.success('현금영수증 발행이 기록되었습니다.');
      await load();
    } catch (err) {
      message.error(err.response?.data?.message || '기록에 실패했습니다.');
    }
  };

  const columns = [
    {
      title: '학생',
      key: 'name',
      width: 80,
      fixed: 'left',
      render: (_, r) => r.student?.name || '-',
    },
    {
      title: '금액',
      dataIndex: 'amount',
      width: 110,
      render: (v, r) => (
        <Typography.Text 
          editable={r.status === '미납' ? {
            onChange: (newVal) => updateAmount(r._id, newVal),
            tooltip: '금액 수정',
          } : false}
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
            <Popconfirm
              title="납부를 취소하시겠습니까?"
              onConfirm={() => cancelPay(r._id)}
              okText="네, 취소합니다"
              cancelText="아니오"
              okButtonProps={{ danger: true }}
            >
              <CloseCircleOutlined 
                style={{ 
                  color: '#ff4d4f', 
                  fontSize: 16, 
                  cursor: 'pointer',
                  transition: 'opacity 0.2s',
                }} 
              />
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
      width: 110,
      render: (_, r) =>
        r.receiptIssued ? (
          <span style={{ fontSize: 12 }}>{r.receiptIssuedAt ? dayjs(r.receiptIssuedAt).format('YYYY-MM-DD') : '발행'}</span>
        ) : (
          '-'
        ),
    },
    {
      title: '작업',
      key: 'actions',
      width: 200,
      render: (_, r) => (
        <Space wrap size="small">
          {r.status === '미납' && (
            <>
              <Button size="small" type="primary" onClick={() => payCard(r._id)}>
                카드수납
              </Button>
              <Button size="small" onClick={() => payCash(r._id)}>
                현금수납
              </Button>
            </>
          )}
          {r.status === '납부완료' && r.paymentMethod === '현금' && !r.receiptIssued && (
            <Button size="small" onClick={() => issueReceipt(r)}>
              현금영수증 발행
            </Button>
          )}
          {r.status === '납부완료' && r.paymentMethod === '현금' && r.student?.cashReceiptPhone && (
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              휴대폰: {r.student.cashReceiptPhone}
            </Typography.Text>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>월별 수납</Typography.Title>
      <Space style={{ marginBottom: 16 }} wrap align="center" size={[8, 12]}>
        <span>대상 월:</span>
        <DatePicker picker="month" value={month} onChange={(d) => d && setMonth(d)} allowClear={false} />
        <Button type="primary" onClick={generate} loading={loading}>
          수강료 고지 생성
        </Button>
        <Popconfirm
          title={`${month.format('YYYY년 M월')} 미납 고지서를 모두 삭제하시겠습니까? (납부 완료된 건은 제외됩니다)`}
          onConfirm={cancelGeneration}
          okText="네, 삭제합니다"
          cancelText="취소"
          okButtonProps={{ danger: true }}
        >
          <Button danger loading={loading}>
            미납 전체 삭제
          </Button>
        </Popconfirm>
        <Popconfirm
          title={`${month.format('YYYY년 M월')} 고지서를 납부완료 포함 모두 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다!`}
          onConfirm={deleteAll}
          okText="네, 모두 삭제합니다"
          cancelText="취소"
          okButtonProps={{ danger: true }}
        >
          <Button danger type="primary" loading={loading}>
            전체 삭제 (납부완료 포함)
          </Button>
        </Popconfirm>
      </Space>

      <div style={{ 
        marginBottom: 20, 
        padding: '16px', 
        background: 'rgba(255, 255, 255, 0.03)', 
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '24px'
      }}>
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>총 고지 금액</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18, color: 'var(--text-main)' }}>
            {rows.reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()}원
          </Typography.Text>
        </div>
        <div style={{ width: 1, background: 'rgba(255, 255, 255, 0.1)', alignSelf: 'stretch' }} />
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>납부 완료</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18, color: '#52c41a' }}>
            {rows.filter(r => r.status === '납부완료').reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()}원
          </Typography.Text>
        </div>
        <div>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>미납 금액</Typography.Text>
          <Typography.Text strong style={{ fontSize: 18, color: '#faad14' }}>
            {rows.filter(r => r.status === '미납').reduce((acc, r) => acc + (r.amount || 0), 0).toLocaleString()}원
          </Typography.Text>
        </div>
      </div>

      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 20 }}>
        「고지 생성」은 해당 월에 아직 고지가 없는 재원 학생에게만 월수강료를 복사해 고지서를 만듭니다. 현금 수납 후 「현금영수증 발행」으로 발행 이력을 남깁니다.
      </Typography.Paragraph>
      <Table 
        rowKey="_id" 
        loading={loading} 
        columns={columns} 
        dataSource={rows} 
        pagination={{ pageSize: 30 }} 
        scroll={{ x: 670 }}
        size="small"
      />
    </div>
  );
}
