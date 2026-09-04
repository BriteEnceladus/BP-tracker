import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = { children: ReactNode };
type State = { error: Error | null };

/**
 * Catches render errors in the unlocked app tree so CryptoProvider is not remounted.
 * A remount would clear isUnlocked while salt/verifier stay in SecureStore, leaving
 * the user stuck on the password LockScreen.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info?.componentStack);
  }

  private retry = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Something went wrong</Text>
          <Text style={styles.body}>
            Your master password and encrypted data are still on this device. Tap Retry to reopen
            without clearing your unlock session.
          </Text>
          <Text style={styles.detail} numberOfLines={4}>
            {this.state.error.message}
          </Text>
          <TouchableOpacity style={styles.btn} onPress={this.retry} activeOpacity={0.85}>
            <Text style={styles.btnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    color: '#94A3B8',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 16,
  },
  detail: {
    color: '#64748B',
    fontSize: 12,
    marginBottom: 24,
    textAlign: 'center',
  },
  btn: {
    alignSelf: 'center',
    backgroundColor: '#38BDF8',
    paddingHorizontal: 28,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
});
