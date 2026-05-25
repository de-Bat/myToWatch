// apps/mobile/src/components/TVSideNav.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { FocusableItem } from './FocusableItem'
import { colors, typography, spacing, TV_OVERSCAN, TV_SIDE_NAV_WIDTH } from '../design/tokens'
import { useAuthStore } from '../lib/authStore'

const NAV_ITEMS = [
  { label: 'Home',     href: '/(app)/' as const,          icon: '⌂' },
  { label: 'Search',   href: '/(app)/search' as const,    icon: '⌕' },
  { label: 'Profile',  href: '/(app)/profile' as const,   icon: '◉' },
  { label: 'Settings', href: '/(app)/settings/' as const, icon: '⚙', adminOnly: true },
]

export function TVSideNav() {
  const router = useRouter()
  const pathname = usePathname()
  const role = useAuthStore((s) => s.role)

  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === 'ADMIN')

  return (
    <View style={styles.nav}>
      <Text style={[typography.heading, styles.brand]}>myToWatch</Text>
      {items.map((item, idx) => {
        const active = pathname === item.href || pathname.startsWith(item.href.replace(/\/$/, ''))
        return (
          <FocusableItem
            key={item.href}
            onPress={() => router.push(item.href as Parameters<typeof router.push>[0])}
            hasTVPreferredFocus={idx === 0}
            style={active ? { ...styles.item, ...styles.itemActive } : styles.item}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[typography.body, active && styles.labelActive]}>{item.label}</Text>
          </FocusableItem>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  nav: {
    width: TV_SIDE_NAV_WIDTH,
    backgroundColor: 'rgba(13,13,26,0.95)',
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingTop: TV_OVERSCAN + spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: TV_OVERSCAN,
  },
  brand: {
    color: colors.accent,
    marginBottom: spacing.xxl,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
  },
  itemActive: {
    backgroundColor: colors.bgCardFocused,
  },
  icon: {
    fontSize: 20,
    color: colors.text,
    marginRight: spacing.md,
    width: 28,
    textAlign: 'center',
  },
  labelActive: {
    color: colors.accent,
    fontWeight: '700',
  },
})
