import { Document, Packer, Paragraph, TextRun, HeadingLevel, SectionType } from 'docx';
import { formatExamMetaLines } from '@/lib/expectedExamMeta';

/**
 * @param {{ academyName?: string, teacherName?: string, schoolName?: string, grade?: string, year?: string, semester?: string, examType?: string, paperTitle?: string }} meta
 * @param {{ num: number, label: string, text: string }[]} items
 */
export async function buildExpectedExamDocxBlob(meta, items) {

  const title = meta.paperTitle?.trim() || '예상문제 세트';
  const metaLines = formatExamMetaLines(meta);

  const metaChildren = [
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 36 })],
      heading: HeadingLevel.TITLE,
      spacing: { after: 400 },
    }),
    new Paragraph({
      children: [new TextRun({ text: '시험 정보', bold: true, size: 26 })],
      spacing: { after: 200 },
    }),
  ];
  for (const line of metaLines) {
    metaChildren.push(
      new Paragraph({
        children: [new TextRun({ text: line, size: 22 })],
        spacing: { after: 120 },
      }),
    );
  }

  const problemChildren = [
    new Paragraph({
      children: [new TextRun({ text: '문제', bold: true, size: 28 })],
      spacing: { after: 240 },
    }),
  ];

  for (const it of items) {
    problemChildren.push(
      new Paragraph({
        children: [new TextRun({ text: `${it.num}번 문제 (${it.label})`, bold: true, color: '1a1a2e', size: 24 })],
        border: { bottom: { value: 'single', size: 6, color: 'e8c87d' } },
        spacing: { before: 200, after: 120 },
      }),
    );
    const lines = (it.text || '').split('\n');
    for (const line of lines) {
      problemChildren.push(
        new Paragraph({
          children: [new TextRun({ text: line || ' ', size: 20 })],
          spacing: { after: 80 },
        }),
      );
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          column: { count: 1 },
        },
        children: metaChildren,
      },
      {
        properties: {
          type: SectionType.NEXT_PAGE,
          column: { count: 2, space: 720 },
        },
        children: problemChildren,
      },
    ],
  });

  return Packer.toBlob(doc);
}
