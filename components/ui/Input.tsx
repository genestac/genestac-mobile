import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  leftIcon?: string;
  rightIcon?: string;
  onRightIconPress?: () => void;
  isPassword?: boolean;
}

export function Input({
  label,
  error,
  containerStyle,
  leftIcon,
  rightIcon,
  onRightIconPress,
  isPassword,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const isSecure = isPassword && !showPassword;

  const handleFocus = (e: any) => {
    setFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
    rest.onFocus?.(e);
  };

  const handleBlur = (e: any) => {
    setFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 180,
      useNativeDriver: false,
    }).start();
    rest.onBlur?.(e);
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#e5e7eb', '#12879a'],
  });

  const bgColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#f7fafb', '#ffffff'],
  });

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={[styles.label, focused && styles.labelFocused, error ? styles.labelError : null]}>
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputWrapper,
          { borderColor: error ? '#ef4444' : borderColor, backgroundColor: bgColor },
        ]}
      >
        {/* Left accent bar — shows on focus */}
        {focused && !error && (
          <View style={styles.accentBar} />
        )}
        {error && (
          <View style={[styles.accentBar, { backgroundColor: '#ef4444' }]} />
        )}

        {leftIcon && (
          <View style={styles.leftIconWrap}>
            <Ionicons
              name={leftIcon as any}
              size={17}
              color={error ? '#ef4444' : focused ? '#12879a' : '#9ca3af'}
            />
          </View>
        )}

        <TextInput
          style={[styles.input, leftIcon ? styles.inputWithLeft : null]}
          placeholderTextColor="#c4cdd6"
          secureTextEntry={isSecure}
          {...rest}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />

        {isPassword && (
          <TouchableOpacity
            style={styles.rightIconBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={focused ? '#12879a' : '#9ca3af'}
            />
          </TouchableOpacity>
        )}
        {rightIcon && !isPassword && (
          <TouchableOpacity
            style={styles.rightIconBtn}
            onPress={onRightIconPress}
          >
            <Ionicons name={rightIcon as any} size={18} color={focused ? '#12879a' : '#9ca3af'} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color="#ef4444" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginLeft: 1,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  labelFocused: {
    color: '#12879a',
  },
  labelError: {
    color: '#ef4444',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    overflow: 'hidden',
    minHeight: 52,
  },
  accentBar: {
    width: 3,
    alignSelf: 'stretch',
    backgroundColor: '#12879a',
    borderRadius: 0,
  },
  leftIconWrap: {
    paddingLeft: 14,
    paddingRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    paddingRight: 14,
    fontSize: 15,
    color: '#1f2937',
    fontWeight: '500',
  },
  inputWithLeft: {
    paddingLeft: 0,
  },
  rightIconBtn: {
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
  },
  errorText: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
  },
});
