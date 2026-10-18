import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import HttpService from '@/services/HttpService';
import { getTrackingFromMiddlewareCookie, getVisitIdentityFromMiddlewareCookie } from '../../../helpers/attributionCookie';
import { trackPaymentAttemptEvent } from '@/helpers/paymentAttempt';

const PayButton = ({
    plan,
    userId,
    attemptId = null,
}) => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const httpService = new HttpService();

    // Ref para que los callbacks de PayPal siempre lean el intento más reciente.
    const attemptIdRef = React.useRef(attemptId);
    React.useEffect(() => {
        if (attemptId) attemptIdRef.current = attemptId;
    }, [attemptId]);

    console.log('Selected plan in PayButton:', plan);

    return (
        <PayPalScriptProvider options={{ 'client-id': clientId }}>
            <PayPalButtons
                style={{
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'sharp',
                }}
                onClick={(data) => {
                    trackPaymentAttemptEvent(attemptIdRef.current, 'paypal_button_clicked', {
                        detail: data?.fundingSource || null,
                        data: { fundingSource: data?.fundingSource || null },
                    });
                }}
                createOrder={async () => {
                    // Llamar a tu backend para crear la orden
                    const tracking = getTrackingFromMiddlewareCookie('last');
                    const { anonId, sessionId } = getVisitIdentityFromMiddlewareCookie();
                    const response = await httpService.postData('payments/paypal/order', {
                        planId : plan.id,
                        userId,
                        tracking,
                        anonId,
                        sessionId,
                        attemptId: attemptIdRef.current,
                    });
                    const { id, attemptId: serverAttemptId } = await response.data; // Aca se extrae el id
                    if (serverAttemptId) attemptIdRef.current = serverAttemptId;
                    return id;
                }}
                onApprove={async (data) => {
                    trackPaymentAttemptEvent(attemptIdRef.current, 'paypal_approved', {
                        data: { orderID: data?.orderID || null },
                    });
                    const tracking = getTrackingFromMiddlewareCookie('last');
                    const { anonId, sessionId } = getVisitIdentityFromMiddlewareCookie();
                    const response = await httpService.postData('payments/paypal/capture', {
                        orderID: data.orderID,
                        planId: plan.id,
                        userId: userId,
                        tracking,
                        anonId,
                        sessionId,
                    });
                    console.log('onApprove response', response);
                    if (response.data?.success) {
                        // Redirigir a la nueva vista de éxito con el valor real
                        const amt = response.data.amount || plan.total;
                        const cur = response.data.currency || 'USD';
                        window.location.href = `/payment-success?value=${amt}&currency=${cur}`;
                    } else {
                        alert('Hubo un problema al procesar tu pago.');
                    }
                }}
                onCancel={(data) => {
                    trackPaymentAttemptEvent(attemptIdRef.current, 'paypal_cancelled', {
                        data: { orderID: data?.orderID || null },
                    });
                }}
                onError={(err) => {
                    trackPaymentAttemptEvent(attemptIdRef.current, 'paypal_error', {
                        detail: String(err?.message || err || 'unknown').slice(0, 250),
                    });
                }}
            />
        </PayPalScriptProvider>
    );
}

export default PayButton;
