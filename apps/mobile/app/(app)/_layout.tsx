// apps/mobile/app/(app)/_layout.tsx
import React from 'react'
import { View, StyleSheet, Platform } from 'react-native'
import { Tabs, Stack } from 'expo-router'
import { TVSideNav } from '../../src/components/TVSideNav'
import { colors, TV_OVERSCAN } from '../../src/design/tokens'

function TVLayout({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.tv}>
      <TVSideNav />
      <View style={[styles.content, { paddingTop: TV_OVERSCAN, paddingRight: TV_OVERSCAN }]}>
        {children}
      </View>
    </View>
  )
}

export default function AppLayout() {
  if (Platform.isTV) {
    return (
      <TVLayout>
        <Stack screenOptions={{ headerShown: false }} />
      </TVLayout>
    )
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarLabel: 'Home' }} />
      <Tabs.Screen name="search" options={{ title: 'Search', tabBarLabel: 'Search' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarLabel: 'Profile' }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="media" options={{ href: null }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  tv: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
})
