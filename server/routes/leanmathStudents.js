/**
 * server/routes/leanmathStudents.js
 * 
 * 린매쓰 학생(LeanmathStudent) 정보의 CRUD를 담당하는 Express API 라우터입니다.
 * - 조회 (목록 검색, 상세 조회, 페이지네이션)
 * - 생성 (ID 자동 생성 포함)
 * - 수정 (유효성 검사 및 업데이트)
 * - 삭제 (예외 처리 포함)
 */

const express = require('express');
const router = express.Router();
const LeanmathStudent = require('../models/LeanmathStudent');

/**
 * @route   GET /api/leanmath-students
 * @desc    린매쓰 학생 목록 조회 (검색, 필터링, 페이지네이션 지원)
 */
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { search, status } = req.query;
    const query = {};

    // 1. 상태(status) 필터링 (재원, 퇴원, 대기 등)
    if (status) {
      query.status = status;
    }

    // 2. 검색어(search) 필터링 (이름, 학교명, 반 이름 대상)
    if (search) {
      const searchRegex = new RegExp(search, 'i');
      query.$or = [
        { name: searchRegex },
        { school_name: searchRegex },
        { class_name: searchRegex },
      ];
    }

    // DB에서 조건에 부합하는 학생 목록 조회 및 전체 개수 계산
    const students = await LeanmathStudent.find(query)
      .sort({ id: -1 }) // 최신 등록순 혹은 ID 역순 정렬
      .skip(skip)
      .limit(limit);

    const total = await LeanmathStudent.countDocuments(query);

    res.json({
      students,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error('린매쓰 학생 목록 조회 중 오류 발생:', error);
    res.status(500).json({ message: '학생 목록을 불러오는 도중 오류가 발생했습니다.' });
  }
});

/**
 * @route   GET /api/leanmath-students/:id
 * @desc    린매쓰 학생 상세 조회 (MongoDB _id 기준)
 */
router.get('/:id', async (req, res) => {
  try {
    const student = await LeanmathStudent.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: '해당 학생을 찾을 수 없습니다.' });
    }
    res.json(student);
  } catch (error) {
    console.error('린매쓰 학생 상세 조회 중 오류 발생:', error);
    res.status(500).json({ message: '학생 정보를 불러오는 도중 오류가 발생했습니다.' });
  }
});

/**
 * @route   POST /api/leanmath-students
 * @desc    신규 린매쓰 학생 생성
 */
router.post('/', async (req, res) => {
  try {
    const { name, fees } = req.body;

    // 필수값 검증
    if (!name) {
      return res.status(400).json({ message: '학생 이름은 필수 입력 항목입니다.' });
    }

    // leanmath.json 호환용 고유 numeric ID 자동 생성
    const maxIdStudent = await LeanmathStudent.findOne().sort({ id: -1 });
    const nextId = maxIdStudent ? maxIdStudent.id + 1 : 1;

    // 신규 학생 정보 구성
    const newStudentData = {
      ...req.body,
      id: nextId,
      workspace: 'leanmath',
      flag: '1',
      modified_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    const newStudent = new LeanmathStudent(newStudentData);
    const savedStudent = await newStudent.save();

    res.status(201).json(savedStudent);
  } catch (error) {
    console.error('린매쓰 학생 생성 중 오류 발생:', error);
    res.status(500).json({ message: '학생 등록 중 오류가 발생했습니다.' });
  }
});

/**
 * @route   PUT /api/leanmath-students/:id
 * @desc    린매쓰 학생 정보 수정
 */
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;

    // 필수값 검증
    if (name === '') {
      return res.status(400).json({ message: '학생 이름은 필수 입력 항목입니다.' });
    }

    // 수정 시간 갱신
    const updateData = {
      ...req.body,
      modified_time: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    const updatedStudent = await LeanmathStudent.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (!updatedStudent) {
      return res.status(404).json({ message: '해당 학생을 찾을 수 없습니다.' });
    }

    res.json(updatedStudent);
  } catch (error) {
    console.error('린매쓰 학생 정보 수정 중 오류 발생:', error);
    res.status(500).json({ message: '학생 정보 수정 중 오류가 발생했습니다.' });
  }
});

/**
 * @route   DELETE /api/leanmath-students/:id
 * @desc    린매쓰 학생 삭제
 */
router.delete('/:id', async (req, res) => {
  try {
    const deletedStudent = await LeanmathStudent.findByIdAndDelete(req.params.id);
    if (!deletedStudent) {
      return res.status(404).json({ message: '해당 학생을 찾을 수 없습니다.' });
    }
    res.json({ message: '학생 정보가 성공적으로 삭제되었습니다.', id: deletedStudent.id });
  } catch (error) {
    console.error('린매쓰 학생 삭제 중 오류 발생:', error);
    res.status(500).json({ message: '학생 삭제 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
