import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import HttpService from '@/services/HttpService'; 

const PayButton = ({
    plan,
    userId
}) => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const httpService = new HttpService(); 

    console.log('Selected plan in PayButton:', plan);

    return (
        <PayPalScriptProvider options={{ 'client-id': clientId }}>
            <PayPalButtons
                style={{ 
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'sharp',
                }}
                createOrder={async () => {
                    // Llamar a tu backend para crear la orden
                    const response = await httpService.postData('payments/paypal/order', {
                        planId : plan.id,
                        userId
                    });
                    const { id } = await response.data; // Aca se extrae el id
                    return id;
                }}
                onApprove={async (data) => {
                    const response = await httpService.postData('payments/paypal/capture', {
                        orderID: data.orderID,
                        planId: plan.id, 
                        userId: userId,
                    });
                    console.log('onApprove response', response);
                    if (response.data?.success) {
                        alert('Pago completado ✅ ¡Gracias por tu compra!');
                        // Opcional: redirigir al usuario o actualizar la UI
                        window.location.href = '/dashboard';
                    } else {
                        alert('Hubo un problema al procesar tu pago.');
                    }
                }}
            />
        </PayPalScriptProvider>
    );
}

export default PayButton;