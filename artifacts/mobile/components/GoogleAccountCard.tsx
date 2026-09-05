import React from 'react';
import { Alert, Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useColors } from '../hooks/useColors';
import { useGoogleAuth } from '../context/GoogleAuthContext';

export function GoogleAccountCard() {
  const colors = useColors();
  const { profile, isBusy, isConfigured, signIn, signOut } = useGoogleAuth();

  const confirmSignOut = () => {
    Alert.alert(
      'Sign out of Google?',
      'This only signs Google out on this phone. Your readings stay in BP Tracker.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
      ]
    );
  };

  return (
    <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Google account</Text>
      <Text style={[styles.hint, { color: colors.mutedForeground }]}>
        Optional. Sign-in does not replace your app password. Readings are not sent to Google.
      </Text>
      {profile ? (
        <>
          <View style={styles.row}>
            <Text style={{ color: colors.foreground }}>Signed in</Text>
            <Text style={{ color: colors.normal, fontWeight: '600', maxWidth: '60%' }} numberOfLines={1}>
              {profile.email || profile.name || 'Google account'}
            </Text>
          </View>
          <TouchableOpacity style={styles.row} onPress={confirmSignOut}>
            <Text style={{ color: colors.foreground }}>Sign out</Text>
            <Feather name="log-out" size={18} color={colors.mutedForeground} />
          </TouchableOpacity>
        </>
      ) : (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary, opacity: isBusy ? 0.6 : 1 }]}
          onPress={() => void signIn()}
          disabled={isBusy}
        >
          <Feather name="user" size={16} color={colors.primaryForeground} />
          <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>
            {isConfigured ? 'Sign in with Google' : 'Sign in with Google (needs client IDs)'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
