import { useEffect } from 'react';
import { router } from 'expo-router';

export default function BuyProductsScreen() {
  useEffect(() => {
    router.replace('/(app)/dashboard');
  }, []);
  return null;
}
