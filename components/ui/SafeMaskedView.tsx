import React from 'react';
import { View, UIManager, Platform } from 'react-native';

/**
 * Safely check if native RNCMaskedView ViewManager is present in the current host binary
 */
function hasNativeMaskedView(): boolean {
  if (Platform.OS === 'web') return false;
  try {
    if (typeof UIManager.hasViewManagerConfig === 'function') {
      return UIManager.hasViewManagerConfig('RNCMaskedView');
    }
    return Boolean((UIManager as any)?.getViewManagerConfig?.('RNCMaskedView'));
  } catch {
    return false;
  }
}

let MaskedViewComponent: any = null;
if (hasNativeMaskedView()) {
  try {
    MaskedViewComponent = require('@react-native-masked-view/masked-view').default;
  } catch {
    MaskedViewComponent = null;
  }
}

interface SafeMaskedViewProps {
  maskElement: React.ReactElement;
  children: React.ReactNode;
  style?: any;
}

export function SafeMaskedView({ maskElement, children, style }: SafeMaskedViewProps) {
  if (MaskedViewComponent) {
    try {
      return (
        <MaskedViewComponent maskElement={maskElement} style={style}>
          {children}
        </MaskedViewComponent>
      );
    } catch {
      // Fallback
    }
  }

  // Fallback: Render mask element directly so text is visible without native crash
  return maskElement;
}
