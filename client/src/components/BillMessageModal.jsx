import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, message, Spin } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import { generateTuitionMessage } from '../utils/billMessageUtils';
import client from '../api/client';

const { TextArea } = Input;

export default function BillMessageModal({ visible, bill, onClose }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAndGenerate = async () => {
      if (visible && bill) {
        setLoading(true);
        try {
          const { data } = await client.get('/settings/bill_message_config_v2');
          // data.value 에 templates, bankAccount 가 들어있음
          const generated = generateTuitionMessage(bill, data?.value);
          setContent(generated);
        } catch (err) {
          message.error('안내 메시지 설정을 불러오지 못했습니다.');
          setContent(generateTuitionMessage(bill, null));
        } finally {
          setLoading(false);
        }
      }
    };
    loadAndGenerate();
  }, [visible, bill]);

  const handleCopy = () => {
    if (!content) return;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(content).then(() => {
        message.success('메시지가 클립보드에 복사되었습니다.');
      }).catch(() => {
        message.error('클립보드 복사에 실패했습니다.');
      });
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = content;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        message.success('메시지가 클립보드에 복사되었습니다.');
      } catch (err) {
        message.error('클립보드 복사에 실패했습니다.');
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <Modal
      title="수강료 안내 메시지 미리보기"
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="close" onClick={onClose}>
          닫기
        </Button>,
        <Button 
          key="copy" 
          type="primary" 
          icon={<CopyOutlined />} 
          onClick={handleCopy}
          style={{ background: '#52c41a', borderColor: '#52c41a' }}
          disabled={loading || !content}
        >
          복사하기
        </Button>,
      ]}
      width={500}
      centered
    >
      <Spin spinning={loading}>
        <div style={{ marginBottom: 12, fontSize: 13, color: 'rgba(255, 255, 255, 0.45)' }}>
          * 아래 내용을 수정하여 복사할 수 있습니다. 설정 페이지에서 기본 템플릿을 변경할 수 있습니다.
        </div>
        <TextArea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          autoSize={{ minRows: 15, maxRows: 25 }}
          style={{ 
            fontFamily: 'inherit', 
            fontSize: '14px', 
            lineHeight: '1.6',
            padding: '12px'
          }}
        />
      </Spin>
    </Modal>
  );
}
