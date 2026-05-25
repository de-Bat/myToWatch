// apps/mobile/app/login.tsx
import React, { useState } from 'react'
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useAuthStore } from '../src/lib/authStore'
import { colors, typography, spacing } from '../src/design/tokens'

export default function LoginScreen() {
  const router = useRouter()
  const { serverUrl, setTokens } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    setLoading(true)
    try {
      const endpoint = isRegister ? '/auth/register' : '/auth/login'
      const res = await fetch(`${serverUrl}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `${res.status}`)
      setTokens(data.accessToken, data.refreshToken, data.user.id, data.user.role)
      router.replace('/(app)/')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Authentication failed')
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
        <Text style={[typography.display, styles.title]}>
          {isRegister ? 'Create Account' : 'Sign In'}
        </Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="email@example.com"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={[styles.btn, loading && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator color={colors.text} />
            : <Text style={[typography.body, styles.btnText]}>
                {isRegister ? 'Create Account' : 'Sign In'}
              </Text>
          }
        </Pressable>
        <View style={styles.toggle}>
          <Text style={[typography.caption]}>
            {isRegister ? 'Already have an account?' : 'No account yet?'}
          </Text>
          <Pressable onPress={() => setIsRegister(!isRegister)}>
            <Text style={[typography.caption, styles.toggleLink]}>
              {isRegister ? 'Sign In' : 'Register'}
            </Text>
          </Pressable>
        </View>
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
    marginBottom: spacing.md,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { fontWeight: '700' },
  toggle: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  toggleLink: {
    color: colors.accent,
    fontWeight: '600',
  },
})
