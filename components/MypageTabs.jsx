'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import MypageDeleteAccount from '@/components/MypageDeleteAccount';
import { describeLedgerReference, ledgerTypeLabelKo } from '@/lib/mypageFormatters';
import { cashGrantedFromPaymentMetadata } from '@/lib/pricingPacks';

// ── helpers ──────────────────────────────────────────────────────────────────

const TRUSTED_HOSTNAMES = new Set(['lh3.googleusercontent.com', 'k.kakaocdn.net']);

function isTrustedUrl(url) {
  if (!url || typeof url !== 'string') return false;
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === 'https:' && TRUSTED_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ko-KR');
}

function fmtAmount(type, amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return '—';
  return type === 'spend' ? `−${n.toLocaleString()}` : `+${n.toLocaleString()}`;
}

// ── Pagination ────────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;

  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  const pages = Array.from({ length: end - start + 1 }, (_, i) => start + i);

  return (
    <nav className="mypagePagination" aria-label="페이지 이동">
      <button
        className="mypagePageBtn"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        aria-label="이전 페이지"
      >
        ‹
      </button>
      {start > 1 && (
        <>
          <button className="mypagePageBtn" onClick={() => onPage(1)}>1</button>
          {start > 2 && <span className="mypagePageEllipsis">…</span>}
        </>
      )}
      {pages.map((p) => (
        <button
          key={p}
          className={`mypagePageBtn${p === page ? ' mypagePageBtnActive' : ''}`}
          onClick={() => onPage(p)}
          aria-current={p === page ? 'page' : undefined}
        >
          {p}
        </button>
      ))}
      {end < totalPages && (
        <>
          {end < totalPages - 1 && <span className="mypagePageEllipsis">…</span>}
          <button className="mypagePageBtn" onClick={() => onPage(totalPages)}>{totalPages}</button>
        </>
      )}
      <button
        className="mypagePageBtn"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
        aria-label="다음 페이지"
      >
        ›
      </button>
    </nav>
  );
}

// ── Tab: 내 정보 ──────────────────────────────────────────────────────────────

function InfoTab({ user, profile, walletBalance }) {
  const label = profile?.display_name?.trim() || user?.email?.split('@')[0] || '사용자';

  return (
    <div className="mypageTabSection">
      <div className="mypageCard">
        <div className="sectionLabel">캐쉬</div>
        <p className="mypageRow">
          <span className="mypageLabel">잔액</span>
          <span className="mypageBalanceValue">{Number(walletBalance ?? 0).toLocaleString()} 캐쉬</span>
        </p>
        <p className="dragHint" style={{ marginTop: 4, fontSize: '0.78rem' }}>
          <Link href="/pricing">충전하기 →</Link>
        </p>
      </div>

      <div className="mypageCard" style={{ marginTop: 16 }}>
        <div className="sectionLabel">계정</div>
        <p className="mypageRow">
          <span className="mypageLabel">표시 이름</span>
          <span>{label}</span>
        </p>
        <p className="mypageRow">
          <span className="mypageLabel">이메일</span>
          <span>{user?.email ?? '(없음)'}</span>
        </p>
        <p className="mypageRow">
          <span className="mypageLabel">가입</span>
          <span>{profile?.created_at ? fmtDate(profile.created_at) : '—'}</span>
        </p>
        {isTrustedUrl(profile?.avatar_url) && (
          <p className="mypageRow">
            <span className="mypageLabel">아바타</span>
            <Image
              src={profile.avatar_url}
              alt="프로필"
              width={40}
              height={40}
              className="mypageAvatar"
            />
          </p>
        )}
      </div>

      <div className="mypageCard" style={{ marginTop: 16 }}>
        <div className="sectionLabel">회원 탈퇴</div>
        <MypageDeleteAccount />
      </div>
    </div>
  );
}

// ── Tab: 캐쉬 내역 ────────────────────────────────────────────────────────────

const LEDGER_TYPES = [
  { value: 'all', label: '전체' },
  { value: 'spend', label: '사용' },
  { value: 'charge', label: '충전·지급' },
];

function LedgerTab() {
  const [ltype, setLtype] = useState('all');
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (type, m, p) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ type, page: String(p) });
      if (m) params.set('month', m);
      const res = await fetch(`/api/me/ledger?${params}`, { credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `오류 (${res.status})`);
      setData(json);
    } catch (e) {
      setError(e.message || '불러오기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(ltype, month, page);
  }, [fetchData, ltype, month, page]);

  function onTypeChange(v) {
    setLtype(v);
    setPage(1);
  }
  function onMonthChange(v) {
    setMonth(v);
    setPage(1);
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="mypageTabSection">
      <div className="mypageSubFilters">
        <div className="mypageSubFilterBtns" role="group" aria-label="내역 종류">
          {LEDGER_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              className={`mypageFilterBtn${ltype === t.value ? ' mypageFilterBtnActive' : ''}`}
              onClick={() => onTypeChange(t.value)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mypageMonthWrap">
          <label htmlFor="ledger-month" className="mypageMonthLabel">날짜</label>
          <input
            id="ledger-month"
            type="month"
            className="mypageMonthInput"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
          />
          {month && (
            <button type="button" className="mypageMonthClear" onClick={() => onMonthChange('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && <p className="mypageLoadingMsg">불러오는 중…</p>}
      {error && <p className="mypageErrorMsg">{error}</p>}

      {!loading && !error && (
        <>
          <p className="mypageTotalCount">
            총 <strong>{total.toLocaleString()}</strong>건
            {month && ` (${month})`}
          </p>

          {rows.length === 0 ? (
            <p className="dragHint" style={{ marginTop: 12 }}>해당 기간의 내역이 없습니다.</p>
          ) : (
            <ul className="mypageJobList">
              {rows.map((row) => (
                <li key={row.id} className="mypageJobItem">
                  <div className="mypageJobMeta mypageLedgerRow">
                    <time dateTime={row.created_at}>{fmtDate(row.created_at)}</time>
                    <span className="mypageLedgerType">{ledgerTypeLabelKo(row.type)}</span>
                    <span className={row.type === 'spend' ? 'mypageLedgerAmtSpend' : 'mypageLedgerAmtCharge'}>
                      {fmtAmount(row.type, row.amount)} 캐쉬
                    </span>
                    <span className="mypageLedgerBalance">잔액 {Number(row.balance_after).toLocaleString()}</span>
                  </div>
                  <p className="mypageLedgerRef">{describeLedgerReference(row.reference, row.meta)}</p>
                </li>
              ))}
            </ul>
          )}

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ── Tab: 생성 내역 ────────────────────────────────────────────────────────────

function JobsTab() {
  const [month, setMonth] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (m, p) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p) });
      if (m) params.set('month', m);
      const res = await fetch(`/api/me/jobs?${params}`, { credentials: 'same-origin' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || `오류 (${res.status})`);
      setData(json);
    } catch (e) {
      setError(e.message || '불러오기에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(month, page);
  }, [fetchData, month, page]);

  function onMonthChange(v) {
    setMonth(v);
    setPage(1);
  }

  const rows = data?.rows ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;

  return (
    <div className="mypageTabSection">
      <div className="mypageSubFilters">
        <div className="mypageMonthWrap">
          <label htmlFor="jobs-month" className="mypageMonthLabel">날짜</label>
          <input
            id="jobs-month"
            type="month"
            className="mypageMonthInput"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
          />
          {month && (
            <button type="button" className="mypageMonthClear" onClick={() => onMonthChange('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {loading && <p className="mypageLoadingMsg">불러오는 중…</p>}
      {error && <p className="mypageErrorMsg">{error}</p>}

      {!loading && !error && (
        <>
          <p className="mypageTotalCount">
            총 <strong>{total.toLocaleString()}</strong>건
            {month && ` (${month})`}
          </p>

          {rows.length === 0 ? (
            <p className="dragHint" style={{ marginTop: 12 }}>해당 기간의 생성 내역이 없습니다.</p>
          ) : (
            <ul className="mypageJobList">
              {rows.map((j) => {
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
                      <time dateTime={j.created_at}>{fmtDate(j.created_at)}</time>
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

          <Pagination page={page} totalPages={totalPages} onPage={setPage} />
        </>
      )}
    </div>
  );
}

// ── Root component ────────────────────────────────────────────────────────────

const TABS = [
  { id: 'info', label: '내 정보' },
  { id: 'ledger', label: '캐쉬 내역' },
  { id: 'jobs', label: '생성 내역' },
];

export default function MypageTabs({ user, profile, walletBalance }) {
  const [tab, setTab] = useState('info');

  return (
    <>
      <nav className="mypageTabNav" aria-label="마이페이지 섹션">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mypageTabBtn${tab === t.id ? ' mypageTabBtnActive' : ''}`}
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id ? 'page' : undefined}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'info' && (
        <InfoTab user={user} profile={profile} walletBalance={walletBalance} />
      )}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'jobs' && <JobsTab />}
    </>
  );
}
