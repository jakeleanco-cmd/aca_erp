import React, { useState, useEffect } from 'react';
import { Modal, Input, Button, message, Spin } from 'antd';
import { CopyOutlined, CommentOutlined } from '@ant-design/icons';
import { generateTuitionMessage } from '../utils/billMessageUtils';
import client from '../api/client';

const { TextArea } = Input;

export default function BillMessageModal({ visible, bill, onClose }) {
  const [content, setContent] = useState('');
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAndGenerate = async () => {
      if (visible && bill) {
        setLoading(true);
        try {
          const { data } = await client.get('/settings/bill_message_config_v2');
          // data.value 에 templates, bankAccount, shareUrl 가 들어있음
          setConfig(data?.value);
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

  const handleKakaoShare = () => {
    if (!content) return;
    
    const KAKAO_KEY = import.meta.env.VITE_KAKAO_JS_KEY;
    
    if (!KAKAO_KEY) {
      return message.error('카카오 JavaScript 키가 설정되지 않았습니다. (client/.env 파일 확인)');
    }

    const kakao = window.Kakao;
    if (!kakao) {
      return message.error('카카오 SDK를 불러오지 못했습니다. 페이지를 새로고침해 보세요.');
    }

    // 설정된 공유 URL이 있으면 사용, 없으면 현재 접속 도메인 사용
    const targetUrl = config?.shareUrl || window.location.origin;

    try {
      if (!kakao.isInitialized()) {
        kakao.init(KAKAO_KEY);
      }

      kakao.Share.sendDefault({
        objectType: 'text',
        text: content,
        link: {
          mobileWebUrl: targetUrl,
          webUrl: targetUrl,
        },
        buttonTitle: '학원 홈페이지 이동'
      });
    } catch (err) {
      console.error('Kakao Share Error:', err);
      message.error('카카오톡 전송 중 오류가 발생했습니다.');
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
          icon={<CopyOutlined />} 
          onClick={handleCopy}
          disabled={loading || !content}
        >
          복사하기
        </Button>,
        <Button 
          key="kakao" 
          type="primary" 
          icon={<CommentOutlined />} 
          onClick={handleKakaoShare}
          style={{ background: '#FEE500', borderColor: '#FEE500', color: '#000' }}
          disabled={loading || !content}
        >
          카카오톡 전송
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
