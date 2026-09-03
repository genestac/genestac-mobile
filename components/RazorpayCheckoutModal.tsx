import React from 'react';
import { Modal, View, StyleSheet, TouchableOpacity, ActivityIndicator, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';
import { RAZORPAY_KEY_ID, RazorpayPlan } from '@/lib/razorpay';

interface RazorpayCheckoutModalProps {
  visible: boolean;
  orderId: string;
  plan: RazorpayPlan;
  userName: string;
  userEmail: string;
  userPhone: string;
  onClose: () => void;
  onSuccess: (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature?: string;
  }) => void;
  onFailure: (error: any) => void;
}

export const RazorpayCheckoutModal: React.FC<RazorpayCheckoutModalProps> = ({
  visible,
  orderId,
  plan,
  userName,
  userEmail,
  userPhone,
  onClose,
  onSuccess,
  onFailure,
}) => {
  if (!visible) return null;

  const checkoutHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          body {
            background-color: #0b1f17;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: #ffffff;
          }
          .loader {
            text-align: center;
            padding: 20px;
          }
          .spinner {
            border: 4px solid rgba(255,255,255,0.1);
            width: 44px;
            height: 44px;
            border-radius: 50%;
            border-left-color: #12879a;
            animation: spin 1s linear infinite;
            margin: 0 auto 16px auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .text {
            font-size: 14px;
            color: #cbd5e1;
            font-weight: 500;
          }
        </style>
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
      </head>
      <body>
        <div class="loader">
          <div class="spinner"></div>
          <div class="text">Connecting to Razorpay Secure Gateway...</div>
        </div>
        <script>
          function initRazorpay() {
            try {
              var options = {
                "key": "${RAZORPAY_KEY_ID}",
                "amount": "${plan.amountPaise}",
                "currency": "INR",
                "name": "Genestac Health",
                "description": "${plan.title}",
                ${orderId.startsWith('sub_') ? `"subscription_id": "${orderId}",` : `"order_id": "${orderId}",`}
                "prefill": {
                  "name": "${userName || 'Patient'}",
                  "email": "${userEmail || ''}",
                  "contact": "${userPhone || ''}"
                },
                "theme": {
                  "color": "#12879a"
                },
                "handler": function (response) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    status: 'SUCCESS',
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id || response.razorpay_subscription_id,
                    razorpay_signature: response.razorpay_signature || ''
                  }));
                },
                "modal": {
                  "ondismiss": function() {
                    window.ReactNativeWebView.postMessage(JSON.stringify({
                      status: 'CANCELLED'
                    }));
                  }
                }
              };

              var rzp = new Razorpay(options);
              rzp.on('payment.failed', function (response){
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'FAILED',
                  error: response.error
                }));
              });
              rzp.open();
            } catch(e) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'FAILED',
                error: e.message || 'Failed to open Razorpay'
              }));
            }
          }

          if (document.readyState === 'complete') {
            setTimeout(initRazorpay, 300);
          } else {
            window.addEventListener('load', function() {
              setTimeout(initRazorpay, 300);
            });
          }
        </script>
      </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'SUCCESS') {
        onSuccess(data);
      } else if (data.status === 'CANCELLED') {
        onClose();
      } else if (data.status === 'FAILED') {
        onFailure(data.error);
      }
    } catch (e) {
      console.error('Error parsing webview message:', e);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={s.container} edges={['top', 'bottom', 'left', 'right']}>
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} style={s.closeBtn}>
            <Ionicons name="close" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={s.title}>Razorpay Secure Payment</Text>
          <View style={{ width: 40 }} />
        </View>

        <WebView
          originWhitelist={['*']}
          source={{ html: checkoutHtml, baseUrl: 'https://razorpay.com' }}
          onMessage={handleMessage}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          startInLoadingState={true}
          renderLoading={() => (
            <View style={s.loadingBox}>
              <ActivityIndicator size="large" color={Colors.primaryLight} />
            </View>
          )}
        />
      </SafeAreaView>
    </Modal>
  );
};

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.white,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  loadingBox: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
