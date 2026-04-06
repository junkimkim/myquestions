/** 예상문제 세트 시험지 메타(학원·학교 등) — UI·다운로드 공통 */

export function getDefaultExamMeta() {
  return {
    academyName: '',
    teacherName: '',
    schoolName: '',
    grade: '',
    year: String(new Date().getFullYear()),
    semester: '1',
    examType: 'mid',
    paperTitle: '',
  };
}

/** @param {{ academyName?: string, teacherName?: string, schoolName?: string, grade?: string, year?: string, semester?: string, examType?: string, paperTitle?: string }} meta */
export function formatExamMetaLines(meta) {
  const sem = meta.semester === '2' ? '2학기' : '1학기';
  const exam = meta.examType === 'final' ? '기말고사' : '중간고사';
  const lines = [];
  if (meta.paperTitle?.trim()) lines.push(`시험지 명: ${meta.paperTitle.trim()}`);
  if (meta.academyName?.trim()) lines.push(`학원: ${meta.academyName.trim()}`);
  if (meta.teacherName?.trim()) lines.push(`선생님: ${meta.teacherName.trim()}`);
  if (meta.schoolName?.trim()) lines.push(`학교: ${meta.schoolName.trim()}`);
  if (meta.grade?.trim()) lines.push(`학년: ${meta.grade.trim()}`);
  if (meta.year?.trim()) lines.push(`연도: ${meta.year.trim()}`);
  lines.push(`학기: ${sem}`);
  lines.push(`시험: ${exam}`);
  return lines;
}
