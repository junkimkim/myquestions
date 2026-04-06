import Link from 'next/link';

/**
 * 사업자 등록 등 하단 메타 — 모든 페이지에서 루트 레이아웃으로 노출
 */
export default function SiteBusinessFooter() {
  return (
    <footer className="siteBusinessFooter" role="contentinfo">
      <p className="siteBusinessFooterLinks">
        <Link href="/terms">이용약관</Link>
        {' · '}
        <Link href="/privacy">개인정보처리방침</Link>
      </p>
      <p>상호명: 제이케이에듀케이션</p>
      <p>사업자등록번호: 605-54-01113</p>
      <p>대표자명: 김준기</p>
      <p>사업장 주소: 경기도 부천시 소사구 성무로17번길 55-6, 1층</p>
      <p>유선번호: 010-6893-2048</p>
    </footer>
  );
}
