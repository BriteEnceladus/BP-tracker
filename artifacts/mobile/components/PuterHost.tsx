import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import {
  PUTER_BRIDGE_HTML,
  handlePuterBridgeMessage,
  registerPuterBridgeHost,
  type PuterBridgeRequest,
} from '../utils/puterBridge';

/**
 * Hosts Puter.js inside a single WebView so native iOS/Android can use cloud KV/auth.
 * Off-screen by default; full-screen modal during interactive sign-in (same WebView instance).
 */
export function PuterHost() {
  if (Platform.OS === 'web') return null;

  const webRef = useRef<WebView>(null);
  const [interactive, setInteractive] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const { height } = useWindowDimensions();

  const send = useCallback((req: PuterBridgeRequest) => {
    // Double-stringify so the string is a JS string literal inside injectJavaScript
    const payload = JSON.stringify(JSON.stringify(req));
    const js = `(function(){try{window.__puterHandle && window.__puterHandle(${payload});}catch(e){} true;})();`;
    webRef.current?.injectJavaScript(js);
  }, []);

  useEffect(() => {
    registerPuterBridgeHost({
      send,
      setInteractive,
    });
    return () => registerPuterBridgeHost(null);
  }, [send]);

  const onMessage = (e: WebViewMessageEvent) => {
    handlePuterBridgeMessage(e.nativeEvent.data);
  };

  return (
    <>
      <Modal
        visible={interactive}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setInteractive(false)}
      >
        <View style={styles.modal}>
          <View style={styles.header}>
            <Text style={styles.title}>Puter cloud sign-in</Text>
            <Pressable onPress={() => setInteractive(false)} hitSlop={12}>
              <Text style={styles.close}>Close</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>
            Sign in to your Puter account to back up BP readings to the cloud.
            {!loaded ? ' Loading…' : ''}
          </Text>
          {/* Spacer only — actual WebView is overlaid from the always-mounted host below when interactive */}
          <View style={{ flex: 1 }} />
        </View>
      </Modal>

      {/* Single persistent WebView — position off-screen or fill modal area */}
      <View
        style={
          interactive
            ? [styles.interactiveHost, { top: Platform.OS === 'ios' ? 120 : 90, height: height - 120 }]
            : styles.hiddenHost
        }
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        <WebView
          ref={webRef}
          originWhitelist={['*']}
          source={{ html: PUTER_BRIDGE_HTML, baseUrl: 'https://puter.com' }}
          onMessage={onMessage}
          onLoadEnd={() => setLoaded(true)}
          javaScriptEnabled
          domStorageEnabled
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          setSupportMultipleWindows
          onShouldStartLoadWithRequest={() => true}
          style={styles.web}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  hiddenHost: {
    position: 'absolute',
    width: 1,
    height: 1,
    left: -10,
    top: -10,
    opacity: 0,
    overflow: 'hidden',
    zIndex: -1,
  },
  interactiveHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    elevation: 9999,
    backgroundColor: '#0F172A',
  },
  web: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  modal: {
    flex: 1,
    backgroundColor: '#0F172A',
    paddingTop: Platform.OS === 'ios' ? 56 : 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    color: '#38BDF8',
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    color: '#94A3B8',
    fontSize: 13,
    paddingHorizontal: 16,
    marginBottom: 12,
    lineHeight: 18,
  },
});
