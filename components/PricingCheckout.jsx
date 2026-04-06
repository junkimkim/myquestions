'use client';

/**
 * 토스페이먼츠 SDK v2 — 결제위젯 (`widgets`) 연동.
 * 결제위젯 연동용 클라이언트 키가 필요합니다 (API 개별 연동 키는 위젯에서 사용 불가).
 * @see https://docs.tosspayments.com/sdk/v2/js#결제위젯
 */

import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CASH_TOPUP_PACKS } from '@/lib/pricingPacks';
import { toErrorMessage } from '@/lib/toErrorMessage';
import { TOSS_DEVELOPERS_HOME, TOSS_DOCS_PAYMENT_WIDGET } from '@/lib/tossPaymentsLinks';
import { isTossWidgetKeyTypeError } from '@/lib/tossWidgetKeyError';
import TossPaymentLogsHint from '@/components/TossPaymentLogsHint';

export default function PricingCheckout() {
  /** select: 상품 선택 | widget: 주문 생성 후 위젯 렌더 */
  const [phase, setPhase] = useState('select');
  const [checkout, setCheckout] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [selectedPackId, setSelectedPackId] = useState(() => CASH_TOPUP_PACKS[0]?.id ?? null);
  const [busyPackId, setBusyPackId] = useState(null);
  const [widgetReady, setWidgetReady] = useState(false);
  /** null: 로딩 중, true/false: 서버에 클라이언트+시크릿 쌍 존재 여부 */
  const [tossConfigured, setTossConfigured] = useState(null);
  /** API 개별 연동 키를 넣은 경우 SDK가 거부할 때 true */
  const [wrongWidgetKey, setWrongWidgetKey] = useState(false);

  const widgetsRef = useRef(null);
  const paymentMethodDestroyRef = useRef(null);
  const agreementDestroyRef = useRef(null);

  const refreshTossConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/payments/toss/config', { credentials: 'same-origin' });
      const data = await res.json().catch(() => ({}));
      setTossConfigured(Boolean(data.configured));
    } catch {
      setTossConfigured(false);
    }
  }, []);

  useEffect(() => {
    void refreshTossConfig();
  }, [refreshTossConfig]);

  const variantPayment = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_VARIANT_KEY || 'DEFAULT';
  const variantAgreement = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_AGREEMENT_VARIANT_KEY || 'DEFAULT';

  const startCheckout = useCallback(async (packId) => {
    setLocalError(null);
    setWrongWidgetKey(false);
    setWidgetReady(false);
    setBusyPackId(packId);
    try {
      const res = await fetch('/api/payments/toss/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ packId }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || '주문을 만들 수 없습니다.');
      }
      setCheckout({
        packId,
        clientKey: data.clientKey,
        customerKey: data.customerKey,
        orderId: data.orderId,
        orderName: data.orderName,
        amount: data.amount,
      });
      setPhase('widget');
    } catch (e) {
      const msg = toErrorMessage(e);
      setLocalError(msg);
      setWrongWidgetKey(isTossWidgetKeyTypeError(e) || isTossWidgetKeyTypeError(msg));
    } finally {
      setBusyPackId(null);
    }
  }, []);

  const backToSelect = useCallback(async () => {
    try {
      await paymentMethodDestroyRef.current?.();
      await agreementDestroyRef.current?.();
    } catch {
      /* ignore */
    }
    paymentMethodDestroyRef.current = null;
    agreementDestroyRef.current = null;
    widgetsRef.current = null;
    setWidgetReady(false);
    setCheckout(null);
    setPhase('select');
    setLocalError(null);
    setWrongWidgetKey(false);
  }, []);

  useEffect(() => {
    if (phase !== 'widget' || !checkout) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const tossPayments = await loadTossPayments(checkout.clientKey);
        const widgets = tossPayments.widgets({ customerKey: checkout.customerKey });
        widgetsRef.current = widgets;

        await widgets.setAmount({
          currency: 'KRW',
          value: checkout.amount,
        });

        const pm = await widgets.renderPaymentMethods({
          selector: '#toss-payment-methods',
          variantKey: variantPayment,
        });
        paymentMethodDestroyRef.current = pm.destroy;

        const ag = await widgets.renderAgreement({
          selector: '#toss-agreement',
          variantKey: variantAgreement,
        });
        agreementDestroyRef.current = ag.destroy;

        if (!cancelled) {
          setWidgetReady(true);
        }
      } catch (e) {
        if (!cancelled) {
          const msg = toErrorMessage(e);
          setLocalError(msg);
          setWrongWidgetKey(isTossWidgetKeyTypeError(e) || isTossWidgetKeyTypeError(msg));
        }
      }
    })();

    return () => {
      cancelled = true;
      (async () => {
        try {
          await paymentMethodDestroyRef.current?.();
          await agreementDestroyRef.current?.();
        } catch {
          /* ignore */
        }
        paymentMethodDestroyRef.current = null;
        agreementDestroyRef.current = null;
        widgetsRef.current = null;
      })();
    };
  }, [phase, checkout, variantPayment, variantAgreement]);

  const requestPayment = useCallback(async () => {
    const widgets = widgetsRef.current;
    if (!widgets || !checkout) return;
    setLocalError(null);
    setWrongWidgetKey(false);
    try {
      await widgets.requestPayment({
        orderId: checkout.orderId,
        orderName: checkout.orderName,
        successUrl: `${window.location.origin}/payment/toss/success`,
        failUrl: `${window.location.origin}/payment/toss/fail`,
      });
    } catch (e) {
      if (e?.message === 'User cancelled' || e?.code === 'USER_CANCEL') {
        setLocalError('결제를 취소했습니다.');
      } else {
        const msg = toErrorMessage(e);
        setLocalError(msg);
        setWrongWidgetKey(isTossWidgetKeyTypeError(e) || isTossWidgetKeyTypeError(msg));
      }
    }
  }, [checkout]);

  if (tossConfigured === null) {
    return <p className="dragHint">결제 설정을 확인하는 중…</p>;
  }

  if (!tossConfigured) {
    return (
      <div>
        <p className="persistMsg persistMsgErr">
          토스페이먼츠 키가 없습니다. 프로젝트 루트 <code>.env.local</code>에{' '}
          <code>NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY</code>와 <code>TOSS_PAYMENTS_SECRET_KEY</code> 를 설정하세요.
        </p>
        <TossPaymentLogsHint style={{ marginTop: 16 }} />
      </div>
    );
  }

  if (phase === 'widget' && checkout) {
    return (
      <div className="pricingWidgetSection">
        <button type="button" className="btnSm btnGhost pricingBackBtn" onClick={backToSelect}>
          ← 상품 다시 선택
        </button>
        <p className="pricingWidgetOrderMeta">
          <strong>{checkout.orderName}</strong>
          <span className="pricingWidgetAmount">₩{checkout.amount.toLocaleString()}</span>
        </p>

        {localError && (
          <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
            {localError}
          </p>
        )}
        {wrongWidgetKey && (
          <div className="persistMsg" style={{ marginBottom: 16, lineHeight: 1.55 }}>
            <p style={{ margin: '0 0 8px' }}>
              이 앱은 <strong>결제위젯</strong> SDK만 지원합니다. 토스 개발자센터 → <strong>API 키</strong>에서{' '}
              <strong>「결제위젯 연동」</strong>으로 표시된 클라이언트 키·시크릿 키 <strong>한 쌍</strong>을 발급받아{' '}
              <code>.env.local</code>의 <code>NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY</code>,{' '}
              <code>TOSS_PAYMENTS_SECRET_KEY</code>에 넣어 주세요. <strong>「API 개별 연동」</strong> 키는 다른 결제
              방식이라 여기에 쓸 수 없습니다.
            </p>
            <p style={{ margin: 0 }}>
              <a href={TOSS_DOCS_PAYMENT_WIDGET} target="_blank" rel="noopener noreferrer">
                결제위젯 연동 가이드
              </a>
              {' · '}
              <a href={TOSS_DEVELOPERS_HOME} target="_blank" rel="noopener noreferrer">
                개발자센터에서 키 발급
              </a>
            </p>
          </div>
        )}

        <div id="toss-payment-methods" className="tossWidgetMount" />
        <div id="toss-agreement" className="tossWidgetMount tossWidgetMountAgreement" />

        <button
          type="button"
          className="btnPrimary pricingPayBtn pricingWidgetPayBtn"
          disabled={!widgetReady}
          onClick={() => void requestPayment()}
        >
          {widgetReady ? '결제하기' : '결제 UI 불러오는 중…'}
        </button>
      </div>
    );
  }

  const busy = busyPackId !== null;
  const selectedPack = CASH_TOPUP_PACKS.find((p) => p.id === selectedPackId);

  return (
    <div className="pricingSelectWrap">
      {localError && (
        <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
          {localError}
        </p>
      )}
      <fieldset className="pricingRadioFieldset">
        <legend className="pricingRadioLegend">충전 금액 선택</legend>
        <ul className="pricingRadioList">
          {CASH_TOPUP_PACKS.map((p) => {
            const id = `pricing-pack-${p.id}`;
            return (
              <li key={p.id} className="pricingRadioItem">
                <label htmlFor={id} className={`pricingRadioLabel ${selectedPackId === p.id ? 'pricingRadioLabelActive' : ''}`}>
                  <input
                    id={id}
                    type="radio"
                    name="pricing-pack"
                    className="pricingRadioInput"
                    value={p.id}
                    checked={selectedPackId === p.id}
                    disabled={busy}
                    onChange={() => setSelectedPackId(p.id)}
                  />
                  <span className="pricingRadioBody">
                    <span className="pricingRadioTitleRow">
                      <span className="pricingRadioName">{p.name}</span>
                      <span className="pricingRadioCredits">{p.cashGranted.toLocaleString()} 캐쉬</span>
                    </span>
                    <span className="pricingRadioPrice">결제 ₩{p.priceKrw.toLocaleString()}</span>
                    <span className="pricingRadioNote">{p.note}</span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <button
        type="button"
        className="btnPrimary pricingPayBtn pricingPayBtnSingle"
        disabled={!selectedPackId || busy}
        onClick={() => selectedPackId && void startCheckout(selectedPackId)}
      >
        {busy && selectedPack
          ? '주문 준비 중…'
          : selectedPack
            ? `₩${selectedPack.priceKrw.toLocaleString()} 결제하기`
            : '결제하기'}
      </button>
    </div>
  );
}
