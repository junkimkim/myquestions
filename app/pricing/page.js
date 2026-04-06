import Link from 'next/link';
import QuizForgeNav from '@/components/QuizForgeNav';
import TossPaymentLogsHint from '@/components/TossPaymentLogsHint';
import PricingCheckout from '@/components/PricingCheckout';
import { getCashCostPerGeneration } from '@/lib/credits';

export default function PricingPage() {
  const costPerGen = getCashCostPerGeneration();

  return (
    <div className="container">
      
      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">요금·충전</span>
        </div>
        {/* <p className="subtitle">
          문제 유형당 <strong>{costPerGen} 캐쉬</strong>가 차감됩니다. (환경 변수{' '}
          <code>CASH_COST_PER_GENERATION</code>, 없으면 <code>CREDIT_COST_PER_GENERATION</code>)
        </p> */}
      </header>
      <QuizForgeNav />
      <div className="pricingNotice">
        <p>
           1만원 이상 충전 시 지급 캐쉬에 5%가
          추가됩니다.{' '}
          {/* <code>.env.local</code>에는 개발자센터의 <strong>결제위젯 연동</strong> 클라이언트·시크릿 키 쌍을 넣어야 하며,{' '}
          <strong>API 개별 연동</strong> 키는 이 화면과 호환되지 않습니다. */}
        </p>
        {/* <TossPaymentLogsHint style={{ marginTop: 12, marginBottom: 0 }} /> */}
      </div>

      <div className="sectionLabel">캐쉬 충전</div>
      <p className="dragHint" style={{ marginBottom: 20 }}>
        충전 금액을 선택한 뒤 <strong>결제하기</strong>를 누르세요. 상품·금액은 서비스 오픈 전에 조정할 수 있습니다.
      </p>

      <PricingCheckout />


    </div>
  );
}
