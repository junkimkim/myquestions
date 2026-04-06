import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * 긴 캔버스를 A4 높이로 나누어 PDF에 넣습니다.
 * @param {jsPDF} pdf
 * @param {HTMLCanvasElement} canvas
 * @param {number} pageW mm
 * @param {number} pageH mm
 * @param {boolean} addPageFirst 새 섹션 시작 시 true (첫 페이지는 false)
 */
function addCanvasAcrossPages(pdf, canvas, pageW, pageH, addPageFirst) {
  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const imgWidth = pageW;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  let heightLeft = imgHeight;
  let position = 0;

  if (addPageFirst) {
    pdf.addPage();
  }

  pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
  heightLeft -= pageH;

  while (heightLeft > 0) {
    position -= pageH;
    pdf.addPage();
    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pageH;
  }
}

/**
 * @param {HTMLElement} metaEl
 * @param {HTMLElement} problemsEl
 * @param {string} filename
 */
export async function downloadExpectedExamPdf(metaEl, problemsEl, filename) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  const canvasMeta = await html2canvas(metaEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  addCanvasAcrossPages(pdf, canvasMeta, pageW, pageH, false);

  const canvasProb = await html2canvas(problemsEl, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });
  addCanvasAcrossPages(pdf, canvasProb, pageW, pageH, true);

  pdf.save(filename);
}
