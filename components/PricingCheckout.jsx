'use client';

/**
 * 토스페이먼츠 SDK v2 — 결제위젯 (`widgets`) 연동.
 * 결제위젯 연동용 클라이언트 키가 필요합니다 (API 개별 연동 키는 위젯에서 사용 불가).
 * @see https://docs.tosspayments.com/sdk/v2/js#결제위젯
 */

import { loadTossPayments } from '@tosspayments/tosspayments-sdk';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CREDIT_PACKS } from '@/lib/pricingPacks';
import { toErrorMessage } from '@/lib/toErrorMessage';

export default function PricingCheckout() {
  /** select: 상품 선택 | widget: 주문 생성 후 위젯 렌더 */
  const [phase, setPhase] = useState('select');
  const [checkout, setCheckout] = useState(null);
  const [localError, setLocalError] = useState(null);
  const [busyPackId, setBusyPackId] = useState(null);
  const [widgetReady, setWidgetReady] = useState(false);

  const widgetsRef = useRef(null);
  const paymentMethodDestroyRef = useRef(null);
  const agreementDestroyRef = useRef(null);

  const hasClientKey = Boolean(process.env.NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY);

  const variantPayment = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_WIDGET_VARIANT_KEY || 'DEFAULT';
  const variantAgreement = process.env.NEXT_PUBLIC_TOSS_PAYMENTS_AGREEMENT_VARIANT_KEY || 'DEFAULT';

  const startCheckout = useCallback(async (packId) => {
    setLocalError(null);
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
      setLocalError(toErrorMessage(e));
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
          setLocalError(toErrorMessage(e));
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
        setLocalError(toErrorMessage(e));
      }
    }
  }, [checkout]);

  if (!hasClientKey) {
    return (
      <p className="persistMsg persistMsgErr">
        토스페이먼츠 <strong>결제위젯 연동</strong> 클라이언트 키가 없습니다.{' '}
        <code>NEXT_PUBLIC_TOSS_PAYMENTS_CLIENT_KEY</code>(결제위젯용)와 <code>TOSS_PAYMENTS_SECRET_KEY</code> 를 .env.local 에
        설정하세요.
      </p>
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

  return (
    <>
      {localError && (
        <p className="persistMsg persistMsgErr" style={{ marginBottom: 16 }}>
          {localError}
        </p>
      )}
      <ul className="pricingGrid">
        {CREDIT_PACKS.map((p) => (
          <li key={p.id} className="pricingCard">
            <div className="pricingCardName">{p.name}</div>
            <div className="pricingCardCredits">{p.credits.toLocaleString()} 크레딧</div>
            <div className="pricingCardPrice">₩{p.priceKrw.toLocaleString()}</div>
            <p className="pricingCardNote">{p.note}</p>
            <button
              type="button"
              className="btnPrimary pricingPayBtn"
              disabled={busyPackId !== null}
              onClick={() => startCheckout(p.id)}
            >
              {busyPackId === p.id ? '주문 준비 중…' : '이 상품으로 결제'}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
