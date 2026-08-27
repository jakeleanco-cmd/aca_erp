import { useEffect, useState } from 'react';
import {
  Table,
  Button,
  Input,
  Space,
  Typography,
  Tag,
  Popconfirm,
  message,
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Tooltip,
} from 'antd';
import {
  CloudOutlined,
  ReloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  FileOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';
import client from '../api/client';

/**
 * 바이트 단위를 보기 쉬운 단위(KB, MB, GB)로 변환하는 유틸리티
 */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0 || isNaN(bytes)) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * 파일 확장자 및 MIME 타입에 따른 아이콘 및 태그 색상 반환
 */
function getFileMeta(mimeType, fileName) {
  const name = (fileName || '').toLowerCase();
  if (mimeType?.includes('pdf') || name.endsWith('.pdf')) {
    return {
      icon: <FilePdfOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />,
      tagColor: 'red',
      typeLabel: 'PDF',
    };
  }
  if (
    mimeType?.includes('image') ||
    name.endsWith('.png') ||
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.gif') ||
    name.endsWith('.webp')
  ) {
    return {
      icon: <FileImageOutlined style={{ color: '#1890ff', fontSize: 18 }} />,
      tagColor: 'blue',
      typeLabel: '이미지',
    };
  }
  return {
    icon: <FileOutlined style={{ color: '#8c8c8c', fontSize: 18 }} />,
    tagColor: 'default',
    typeLabel: '기타',
  };
}

export default function GoogleDrivePage() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [quota, setQuota] = useState(null);
  const [quotaLoading, setQuotaLoading] = useState(false);

  // 드라이브 파일 목록 조회
  const loadFiles = async (query = searchQuery) => {
    setLoading(true);
    try {
      const { data } = await client.get('/google-drive/files', {
        params: { query: query.trim(), pageSize: 100 },
      });
      setFiles(data.files || []);
    } catch (error) {
      console.error(error);
      message.error(error.response?.data?.message || '구글 드라이브 파일 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 스토리지 용량 정보 조회
  const loadQuota = async () => {
    setQuotaLoading(true);
    try {
      const { data } = await client.get('/google-drive/quota');
      if (data && data.storageQuota) {
        setQuota(data.storageQuota);
      }
    } catch (error) {
      console.warn('용량 정보 조회 실패:', error);
    } finally {
      setQuotaLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    loadQuota();
  }, []);

  // 단일 파일 삭제
  const handleDelete = async (fileId, fileName) => {
    try {
      await client.delete(`/google-drive/files/${fileId}`);
      message.success(`'${fileName}' 파일이 삭제되었습니다.`);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setSelectedRowKeys((prev) => prev.filter((k) => k !== fileId));
      loadQuota();
    } catch (error) {
      message.error('파일 삭제에 실패했습니다.');
    }
  };

  // 선택 파일 일괄 삭제
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    try {
      const { data } = await client.post('/google-drive/files/batch-delete', {
        fileIds: selectedRowKeys,
      });
      message.success(`${data.count || selectedRowKeys.length}개 파일이 삭제되었습니다.`);
      setSelectedRowKeys([]);
      loadFiles();
      loadQuota();
    } catch (error) {
      message.error('일괄 삭제 중 오류가 발생했습니다.');
    }
  };

  // 테이블 컬럼 정의
  const columns = [
    {
      title: '파일명',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '', 'ko-KR'),
      render: (text, record) => {
        const { icon } = getFileMeta(record.mimeType, record.name);
        return (
          <Space orientation="horizontal" align="center" style={{ wordBreak: 'break-all' }}>
            {icon}
            <Typography.Text strong style={{ fontSize: 13 }}>
              {text}
            </Typography.Text>
          </Space>
        );
      },
    },
    {
      title: '유형',
      dataIndex: 'mimeType',
      key: 'mimeType',
      width: 90,
      align: 'center',
      render: (mimeType, record) => {
        const { tagColor, typeLabel } = getFileMeta(mimeType, record.name);
        return (
          <Tag color={tagColor} style={{ margin: 0 }}>
            {typeLabel}
          </Tag>
        );
      },
    },
    {
      title: '크기',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      align: 'right',
      sorter: (a, b) => Number(a.size || 0) - Number(b.size || 0),
      render: (size) => formatBytes(Number(size || 0)),
    },
    {
      title: '수정일시',
      dataIndex: 'modifiedTime',
      key: 'modifiedTime',
      width: 150,
      align: 'center',
      sorter: (a, b) => new Date(a.modifiedTime) - new Date(b.modifiedTime),
      render: (time) => {
        if (!time) return '-';
        const d = new Date(time);
        return (
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {d.toLocaleDateString('ko-KR')} {d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </Typography.Text>
        );
      },
    },
    {
      title: '관리',
      key: 'actions',
      width: 140,
      fixed: 'right',
      align: 'center',
      render: (_, record) => {
        // webViewLink 또는 webContentLink
        const viewLink = record.webViewLink || `https://drive.google.com/file/d/${record.id}/view`;
        const downloadLink = record.webContentLink || `https://drive.google.com/uc?export=download&id=${record.id}`;

        return (
          <Space size={4}>
            <Tooltip title="드라이브에서 열기 / 미리보기">
              <Button
                size="small"
                type="text"
                icon={<EyeOutlined style={{ color: '#1890ff' }} />}
                onClick={() => window.open(viewLink, '_blank', 'noopener,noreferrer')}
              />
            </Tooltip>
            <Tooltip title="다운로드">
              <Button
                size="small"
                type="text"
                icon={<DownloadOutlined style={{ color: '#52c41a' }} />}
                onClick={() => window.open(downloadLink, '_blank', 'noopener,noreferrer')}
              />
            </Tooltip>
            <Popconfirm
              title="파일을 삭제하시겠습니까?"
              description="구글 클라우드에서 영구적으로 삭제됩니다."
              okText="삭제"
              cancelText="취소"
              okButtonProps={{ danger: true }}
              onConfirm={() => handleDelete(record.id, record.name)}
            >
              <Tooltip title="삭제">
                <Button size="small" type="text" danger icon={<DeleteOutlined />} />
              </Tooltip>
            </Popconfirm>
          </Space>
        );
      },
    },
  ];

  // 스토리지 사용량 퍼센티지 계산
  const usageBytes = Number(quota?.usage || 0);
  const limitBytes = Number(quota?.limit || 0);
  const usagePercent = limitBytes > 0 ? Math.round((usageBytes / limitBytes) * 100) : 0;

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 상단 헤더 & 설명 */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <CloudOutlined style={{ fontSize: 22, color: 'var(--primary-vibrant)' }} />
          <Typography.Title level={4} style={{ margin: 0 }}>
            구글 클라우드 파일 관리
          </Typography.Title>
        </div>
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          시험지 및 평가자료가 안전하게 보관되는 구글 드라이브 클라우드 저장소를 직접 관리합니다.
        </Typography.Text>
      </div>

      {/* 요약 통계 카드 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="glass-effect" style={{ borderRadius: 10 }}>
            <Statistic
              title="보관 중인 파일 수"
              value={files.length}
              suffix="개"
              prefix={<FolderOpenOutlined style={{ color: '#4f46e5' }} />}
              valueStyle={{ fontWeight: 700, color: '#1e293b' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="glass-effect" style={{ borderRadius: 10 }}>
            <Statistic
              title="목록 파일 총 용량"
              value={formatBytes(files.reduce((acc, curr) => acc + Number(curr.size || 0), 0))}
              prefix={<CheckCircleOutlined style={{ color: '#10b981' }} />}
              valueStyle={{ fontWeight: 700, color: '#1e293b' }}
            />
          </Card>
        </Col>
        {quota && limitBytes > 0 && (
          <Col xs={24} sm={24} md={8}>
            <Card size="small" className="glass-effect" style={{ borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  드라이브 전체 용량
                </Typography.Text>
                <Typography.Text style={{ fontSize: 12, fontWeight: 600 }}>
                  {formatBytes(usageBytes)} / {formatBytes(limitBytes)}
                </Typography.Text>
              </div>
              <Progress
                percent={usagePercent}
                size="small"
                status={usagePercent > 90 ? 'exception' : 'active'}
                strokeColor={{
                  '0%': '#4f46e5',
                  '100%': usagePercent > 90 ? '#ef4444' : '#06b6d4',
                }}
              />
            </Card>
          </Col>
        )}
      </Row>

      {/* 검색 및 액션 바 */}
      <Card size="small" style={{ marginBottom: 16, borderRadius: 10 }} className="glass-effect">
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
          <Space wrap size="middle">
            <Input.Search
              placeholder="클라우드 파일명 검색..."
              allowClear
              enterButton={<SearchOutlined />}
              style={{ maxWidth: 300, width: '100%' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onSearch={(val) => loadFiles(val)}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => {
                loadFiles();
                loadQuota();
              }}
              loading={loading || quotaLoading}
            >
              새로고침
            </Button>
          </Space>

          <Space wrap>
            {selectedRowKeys.length > 0 && (
              <Popconfirm
                title={`${selectedRowKeys.length}개의 파일을 구글 드라이브에서 삭제하시겠습니까?`}
                description="삭제된 파일은 복구할 수 없습니다."
                okText="일괄 삭제"
                cancelText="취소"
                okButtonProps={{ danger: true }}
                onConfirm={handleBatchDelete}
              >
                <Button danger type="primary" icon={<DeleteOutlined />}>
                  선택 삭제 ({selectedRowKeys.length})
                </Button>
              </Popconfirm>
            )}
          </Space>
        </div>
      </Card>

      {/* 파일 목록 테이블 */}
      <Card bodyStyle={{ padding: 0 }} style={{ borderRadius: 10, overflow: 'hidden' }} className="glass-effect">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={files}
          loading={loading}
          size="middle"
          scroll={{ x: 750 }}
          tableLayout="flexible"
          pagination={{
            pageSize: 15,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '30', '50'],
            showTotal: (total) => `총 ${total}개의 파일`,
          }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys),
          }}
        />
      </Card>
    </div>
  );
}
