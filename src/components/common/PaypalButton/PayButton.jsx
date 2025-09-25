import React from 'react';
import { PayPalButtons, PayPalScriptProvider } from '@paypal/react-paypal-js';
import HttpService from '@/services/HttpService'; 

const PayButton = () => {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const httpService = new HttpService(); 

    return (
        <PayPalScriptProvider options={{ 'client-id': clientId }}>
            <PayPalButtons
                style={{ 
                    layout: 'vertical',
                    color: 'gold',
                    shape: 'sharp',
                }}
                createOrder={async () => {
                    const response = await httpService.postData('payments/paypal/order'); 
                    console.log('ID createOrder response', response?.data?.id  ?? 'No ID found');
                    const { id } = await response.data;
                    return id;
                }}
                onApprove={async (data) => {
                    const response = await httpService.post('payments/paypal/capture', {
                        orderID: data.orderID,
                    });
                    // const json = await response.json();
                    console.log('onApprove response', response);
                    // TODO: marcar compra OK en tu backend / UI
                    console.log('CAPTURED', json);
                    alert('Pago completado ✅');
                }}
            />
        </PayPalScriptProvider>
    );
}

export default PayButton;