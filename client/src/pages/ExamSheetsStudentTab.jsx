import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Modal, Form, Input, Select, InputNumber, Upload, Space, Typography, Popconfirm, message } from 'antd';
import { UploadOutlined, PlusOutlined, FilePdfOutlined, PictureOutlined, DeleteOutlined } from '@ant-design/icons';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import client from '../api/client';

const SEMESTERS = ['1학기 중간', '1학기 기말', '2학기 중간', '2학기 기말', '기타'];

export default function ExamSheetsStudentTab({ studentId }) {
  const [sheets, setSheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState([]);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    loadSheets();
  }, [studentId]);

  const loadSheets = async () => {
    setLoading(true);
    try {
      const { data } = await client.get(`/exam-sheets/by-student/${studentId}`);
      setSheets(data);
    } catch (err) {
      console.error(err);
      message.error('성적을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const checkFileIsImage = (filename) => {
    return filename && filename.match(/\.(jpeg|jpg|gif|png)$/i) != null;
  };

  // Recharts Data Transformation (Chronological order)
  const chartData = [...sheets]
    .sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return SEMESTERS.indexOf(a.semester) - SEMESTERS.indexOf(b.semester);
    })
    .map(s => ({
      name: `${s.year} ${s.semester}`,
      score: s.score,
      subject: s.subject
    }));

  const handleCreateOrEdit = async () => {
    try {
      const vals = await form.validateFields();
      
      const formData = new FormData();
      formData.append('student', studentId);
      formData.append('schoolName', vals.schoolName || '');
      formData.append('year', vals.year);
      formData.append('semester', vals.semester);
      formData.append('subject', vals.subject);
      formData.append('score', vals.score || 0);
      formData.append('memo', vals.memo || '');

      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      if (editingId) {
        // 기존 유지되는 파일 이름들 전달
        const existingFiles = fileList
          .filter(f => !f.originFileObj && f.url)
          .map(f => f.name);
        formData.append('existingFiles', JSON.stringify(existingFiles));
        
        await client.put(`/exam-sheets/${editingId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('수정되었습니다.');
      } else {
        await client.post('/exam-sheets', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        message.success('등록되었습니다.');
      }
      
      setModalVisible(false);
      loadSheets();
    } catch (err) {
       console.error(err);
       message.error((err.response?.data?.message) || '저장에 실패했습니다.');
    }
  };

  const openNew = () => {
    form.resetFields();
    form.setFieldsValue({ year: new Date().getFullYear(), subject: '수학' });
    setFileList([]);
    setEditingId(null);
    setModalVisible(true);
  };

  const openEdit = (record) => {
    form.setFieldsValue({
      schoolName: record.schoolName,
      year: record.year,
      semester: record.semester,
      subject: record.subject,
      score: record.score,
      memo: record.memo,
    });
    setEditingId(record._id);

    const initialFiles = (record.attachments || []).map((att, i) => ({
      uid: -i,
      name: att.filename,
      status: 'done',
      url: `/api${att.path}` // Assuming proxy routes /api/uploads to /uploads
    }));
    setFileList(initialFiles);
    setModalVisible(true);
  };

  const deleteSheet = async (id) => {
    try {
      await client.delete(`/exam-sheets/${id}`);
      message.success('삭제되었습니다.');
      loadSheets();
    } catch (err) {
      console.error(err);
      message.error('삭제에 실패했습니다.');
    }
  };

  const uploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      setFileList([...fileList, file]);
      return false; // Prevent auto-upload
    },
    fileList,
    listType: "picture",
  };

  const columns = [
    { title: '년도/학기', render: (_, r) => `${r.year} ${r.semester}` },
    { title: '학교명', dataIndex: 'schoolName' },
    { title: '과목', dataIndex: 'subject' },
    { title: '점수', dataIndex: 'score', render: val => <Typography.Text strong>{val}점</Typography.Text> },
    { 
      title: '첨부파일', 
      render: (_, r) => (
        <Space size="small" wrap>
          {(r.attachments || []).map(att => {
            const isImage = checkFileIsImage(att.filename);
            return (
               <a key={att.filename} href={`/api${att.path}`} target="_blank" rel="noopener noreferrer">
                 {isImage ? <PictureOutlined style={{fontSize: 20}} /> : <FilePdfOutlined style={{fontSize: 20, color:'#ff4d4f'}} />}
               </a>
            );
          })}
        </Space>
      )
    },
    { 
      title: '관리', 
      render: (_, r) => (
        <Space>
           <Button size="small" onClick={() => openEdit(r)}>수정</Button>
           <Popconfirm title="삭제하시겠습니까?" onConfirm={() => deleteSheet(r._id)}>
             <Button size="small" danger icon={<DeleteOutlined />} />
           </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      {/* Chart Section */}
      {sheets.length > 0 && (
        <Card title="성적 추이" style={{ border: 'none' }} className="glass-effect">
          <div style={{ height: 300, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.5)" />
                <YAxis domain={[0, 100]} stroke="rgba(255,255,255,0.5)" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8 }} 
                  itemStyle={{ color: '#818cf8' }} 
                />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#818cf8" strokeWidth={3} dot={{ r: 5 }} activeDot={{ r: 8 }} name="점수" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {/* Table Section */}
      <Card 
        title="성적 목록" 
        bodyStyle={{ padding: 0 }}
        style={{ border: 'none' }}
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={openNew}>성적 등록</Button>}
      >
        <Table 
          columns={columns} 
          dataSource={sheets} 
          rowKey="_id" 
          loading={loading}
          pagination={false}
        />
      </Card>

      <Modal 
        title={editingId ? "성적 수정" : "내신 성적 등록"} 
        open={modalVisible} 
        onOk={handleCreateOrEdit} 
        onCancel={() => setModalVisible(false)}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Space style={{ display: 'flex' }}>
            <Form.Item name="year" label="년도" rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="semester" label="학기/고사" rules={[{ required: true }]}>
              <Select style={{ width: 150 }} options={SEMESTERS.map(s => ({label:s, value:s}))} />
            </Form.Item>
          </Space>
          
          <Space style={{ display: 'flex' }}>
            <Form.Item name="schoolName" label="학교명">
              <Input placeholder="학교 이름" />
            </Form.Item>
            <Form.Item name="subject" label="과목" rules={[{ required: true }]}>
              <Input placeholder="예: 수학, 영어" />
            </Form.Item>
          </Space>

          <Form.Item name="score" label="점수" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          
          <Form.Item name="memo" label="메모">
            <Input.TextArea rows={3} placeholder="기타 특이사항 등 남기기" />
          </Form.Item>

          <Form.Item label="시험지/성적표 첨부">
            <Upload {...uploadProps} multiple>
              <Button icon={<UploadOutlined />}>파일 선택</Button>
            </Upload>
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}
