import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import QuizForgeNav from '@/components/QuizForgeNav';
import { SIGNUP_BONUS_CASH } from '@/lib/cashRules';
import {
  describeLedgerReference,
  ledgerTypeLabelKo,
  paymentStatusLabelKo,
} from '@/lib/mypageFormatters';
import { cashGrantedFromPaymentMetadata } from '@/lib/pricingPacks';
import MypageDeleteAccount from '@/components/MypageDeleteAccount';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const TRUSTED_AVATAR_HOSTNAMES = new Set(['lh3.googleusercontent.com', 'k.kakaocdn.net']);

function isTrustedAvatarUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && TRUSTED_AVATAR_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function formatSignedLedgerAmount(type, amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  if (type === 'spend') return `−${n.toLocaleString()}`;
  return `+${n.toLocaleString()}`;
}

export default async function MypagePage() {
  let supabase;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect('/login?next=/mypage&error=config');
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?next=/mypage');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, created_at')
    .eq('id', user.id)
    .maybeSingle();

  const label = profile?.display_name?.trim() || user.email?.split('@')[0] || '사용자';

  const { data: wallet } = await supabase.from('user_wallets').select('balance').eq('user_id', user.id).maybeSingle();

  const fourteenDaysAgo = new Date();
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const { data: recentJobs } = await supabase
    .from('generation_jobs')
    .select('id, created_at, model, type_label, status, cost_credits, generation_outputs(result_text)')
    .eq('user_id', user.id)
    .gte('created_at', fourteenDaysAgo.toISOString())
    .order('created_at', { ascending: false })
    .limit(20);

  const { data: paymentRows } = await supabase
    .from('payments')
    .select('id, provider, amount_krw, status, metadata, external_id, created_at, updated_at')
    .eq('user_id', user.id)
    .eq('status', 'paid')
    .order('created_at', { ascending: false })
    .limit(50);

  const { data: ledgerRows } = await supabase
    .from('credit_ledger')
    .select('id, type, amount, balance_after, reference, meta, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(80);

  return (
    <div className="container">

      <header>
        <div className="logoRow">
          <span className="logo">QuizForge</span>
          <span className="logoBadge">마이페이지</span>
        </div>
        <p className="subtitle">
          계정·캐쉬·결제·캐쉬 내역·최근 2주 생성 이력(서버 저장)입니다. 신규 가입 시{' '}
          <strong>{SIGNUP_BONUS_CASH.toLocaleString()} 캐쉬</strong>가 자동 지급됩니다.
        </p>
      </header>
      <QuizForgeNav />
      <div className="mypageCard">
        <div className="sectionLabel">캐쉬</div>
        <p className="mypageRow">
          <span className="mypageLabel">잔액</span>
          <span>{wallet?.balance ?? 0}</span>
        </p>
      </div>

      <div className="mypageCard">
        <div className="sectionLabel">계정</div>
        <p className="mypageRow">
          <span className="mypageLabel">표시 이름</span>
          <span>{label}</span>
        </p>
        <p className="mypageRow">
          <span className="mypageLabel">이메일</span>
          <span>{user.email ?? '(없음)'}</span>
        </p>
        <p className="mypageRow">
          <span className="mypageLabel">가입</span>
          <span>{profile?.created_at ? new Date(profile.created_at).toLocaleString('ko-KR') : '—'}</span>
        </p>
        {isTrustedAvatarUrl(profile?.avatar_url) && (
          <p className="mypageRow">
            <span className="mypageLabel">아바타</span>
            <Image src={profile.avatar_url} alt="프로필" width={40} height={40} className="mypageAvatar" />
          </p>
        )}
        <div className="sectionLabel" style={{ marginTop: 20 }}>
          회원 탈퇴
        </div>
        <MypageDeleteAccount />
      </div>

      <div className="mypageCard mypageCardWide">
        <div className="sectionLabel">완료된 결제 내역 (토스 주문, 최대 50건)</div>
        {!paymentRows?.length ? (
          <p className="dragHint">완료된 결제 내역이 없습니다.</p>
        ) : (
          <ul className="mypageJobList">
            {paymentRows.map((p) => {
              const cash = cashGrantedFromPaymentMetadata(p.metadata);
              return (
                <li key={p.id} className="mypageJobItem">
                  <div className="mypageJobMeta">
                    <time dateTime={p.created_at}>{new Date(p.created_at).toLocaleString('ko-KR')}</time>
                    <span className="mypageJobBadge">{paymentStatusLabelKo(p.status)}</span>
                    <span>{providerLabel(p.provider)}</span>
                    <span>{Number(p.amount_krw).toLocaleString()}원</span>
                    {cash > 0 && (
                      <span className="mypageLedgerAmtCharge">+{cash.toLocaleString()} 캐쉬 지급</span>
                    )}
                    {p.external_id && <span className="mypageJobModel">{p.external_id}</span>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mypageCard mypageCardWide">
        <div className="sectionLabel">캐쉬 사용·충전 내역 (원장, 최대 80건)</div>
        <p className="dragHint" style={{ marginBottom: 12 }}>
          결제·가입 보너스·문제 생성 차감 등 잔액 변동이 모두 기록됩니다.
        </p>
        {!ledgerRows?.length ? (
          <p className="dragHint">아직 기록이 없습니다.</p>
        ) : (
          <ul className="mypageJobList">
            {ledgerRows.map((row) => (
              <li key={row.id} className="mypageJobItem">
                <div className="mypageJobMeta mypageLedgerRow">
                  <time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('ko-KR')}</time>
                  <span className="mypageLedgerType">{ledgerTypeLabelKo(row.type)}</span>
                  <span
                    className={
                      row.type === 'spend' ? 'mypageLedgerAmtSpend' : 'mypageLedgerAmtCharge'
                    }
                  >
                    {formatSignedLedgerAmount(row.type, row.amount)} 캐쉬
                  </span>
                  <span className="mypageLedgerBalance">잔액 {Number(row.balance_after).toLocaleString()}</span>
                </div>
                <p className="mypageLedgerRef">{describeLedgerReference(row.reference, row.meta)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mypageCard mypageCardWide">
        <div className="sectionLabel">최근 생성 (2주 이내, 최대 20건)</div>
        {!recentJobs?.length ? (
          <p className="dragHint">아직 저장된 생성 결과가 없습니다.</p>
        ) : (
          <ul className="mypageJobList">
            {recentJobs.map((j) => {
              const preview = j.generation_outputs?.[0]?.result_text;
              const snippet =
                typeof preview === 'string' && preview.length > 0
                  ? preview.length > 180
                    ? `${preview.slice(0, 180)}…`
                    : preview
                  : null;
              return (
                <li key={j.id} className="mypageJobItem">
                  <div className="mypageJobMeta">
                    <time dateTime={j.created_at}>{new Date(j.created_at).toLocaleString('ko-KR')}</time>
                    <span className="mypageJobBadge">{j.status}</span>
                    <span>{j.cost_credits} 캐쉬</span>
                    {j.model && <span className="mypageJobModel">{j.model}</span>}
                    {j.type_label && <span>{j.type_label}</span>}
                    <Link href={`/mypage/jobs/${j.id}`} className="mypageJobDetailLink">
                      상세
                    </Link>
                  </div>
                  {snippet && <p className="mypageJobPreview">{snippet}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="dragHint" style={{ marginTop: 24 }}>
        <Link href="/">← 문제 생성</Link>
        {' · '}
        <Link href="/pricing">요금·충전</Link>
      </p>
    </div>
  );
}

function providerLabel(provider) {
  if (provider === 'tosspayments') return '토스페이먼츠';
  return provider || '—';
}
