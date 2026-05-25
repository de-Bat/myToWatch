// apps/mobile/app/_layout.tsx
import React, { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../src/lib/authStore'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
})

function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const segments = useSegments()
  const { serverUrl, accessToken } = useAuthStore()

  useEffect(() => {
    const seg0 = segments[0] as string | undefined
    const inAuth = seg0 === 'login' || seg0 === 'onboarding'

    if (!serverUrl) {
      if (!inAuth) router.replace('/onboarding')
      return
    }
    if (!accessToken) {
      if (!inAuth) router.replace('/login')
      return
    }
    if (inAuth) {
      router.replace('/(app)/')
    }
  }, [serverUrl, accessToken, segments])

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <AuthGate>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0D0D1A' } }} />
      </AuthGate>
    </QueryClientProvider>
  )
}
