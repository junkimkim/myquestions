import Link from 'next/link';
import QuizForgeNav from '@/components/QuizForgeNav';
import PricingCheckout from '@/components/PricingCheckout';
import { getCreditCostPerGeneration } from '@/lib/credits';

export default function PricingPage() {
  const costPerGen = getCreditCostPerGeneration();

  return (
    <div className="container">
      
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">요금·충전</span>
        </div>
        <p className="subtitle">
          생성 1회당 약 <strong>{costPerGen} 크레딧</strong>이 차감됩니다. (환경 변수 <code>CREDIT_COST_PER_GENERATION</code>로 조정 가능)
        </p>
      </header>
      <QuizForgeNav />
      <div className="pricingNotice">
        <p>
          아래에서 <strong>토스페이먼츠</strong> 결제창으로 카드 결제 시 크레딧이 자동 충전됩니다. 테스트 키·라이브 키는 토스페이먼츠
          대시보드에서 발급합니다.
        </p>
      </div>

      <div className="sectionLabel">크레딧 팩</div>
      <p className="dragHint" style={{ marginBottom: 20 }}>
        상품·금액은 서비스 오픈 전에 조정할 수 있습니다.
      </p>

      <PricingCheckout />

      <p className="dragHint" style={{ marginTop: 32 }}>
        잔액·계정은 상단 <strong>마이페이지</strong> 메뉴에서 확인하세요.{' · '}
        <Link href="/">문제 생성</Link>
      </p>
    </div>
  );
}
