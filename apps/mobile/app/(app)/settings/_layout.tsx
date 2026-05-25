// apps/mobile/app/(app)/settings/_layout.tsx
import { Stack, useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '../../../src/lib/authStore'
import { colors } from '../../../src/design/tokens'

export default function SettingsLayout() {
  const router = useRouter()
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    if (role !== 'ADMIN') router.replace('/(app)/')
  }, [role])

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
  )
}
