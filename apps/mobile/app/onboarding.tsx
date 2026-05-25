// apps/mobile/app/onboarding.tsx
import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../src/lib/authStore'
import { colors, typography, spacing } from '../src/design/tokens'

export default function OnboardingScreen() {
  const router = useRouter()
  const setServerUrl = useAuthStore((s) => s.setServerUrl)
  const [url, setUrl] = useState('http://')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleConnect = async () => {
    setError(null)
    setLoading(true)
    try {
      const clean = url.replace(/\/$/, '')
      const res = await fetch(`${clean}/auth/register`, { method: 'HEAD' }).catch(() => null)
      // Any response (even 4xx) means server is reachable
      if (!res && !(await fetch(`${clean}/health`).catch(() => null))) {
        throw new Error('Cannot reach server. Check the URL and that the backend is running.')
      }
      setServerUrl(clean)
      router.replace('/login')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={[typography.displayLg, styles.title]}>myToWatch</Text>
        <Text style={[typography.body, styles.subtitle]}>
          Enter your self-hosted backend URL to get started.
        </Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={setUrl}
          placeholder="http://192.168.1.10:3000"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleConnect}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleConnect}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.text} />
            : <Text style={[typography.body, styles.btnText]}>Connect</Text>
          }
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    width: '90%',
    maxWidth: 480,
    backgroundColor: colors.bgCard,
    borderRadius: 16,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: 16,
    marginBottom: spacing.md,
  },
  error: {
    color: colors.error,
    fontSize: 14,
    marginBottom: spacing.md,
  },
  btn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    fontWeight: '700',
  },
})
