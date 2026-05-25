// apps/mobile/app/(app)/settings/index.tsx
import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'

const ITEMS = [
  { label: 'Providers', sub: 'Configure Jellyfin, Netflix, and more', href: '/(app)/settings/providers' as const },
  { label: 'Users',     sub: 'Manage user roles and access',          href: '/(app)/settings/users' as const },
]

export default function SettingsScreen() {
  const router = useRouter()
  return (
    <View style={styles.container}>
      <Text style={[typography.displayLg, styles.title]}>Settings</Text>
      {ITEMS.map((item, idx) => (
        <FocusableItem
          key={item.href}
          onPress={() => router.push(item.href)}
          hasTVPreferredFocus={idx === 0}
          style={styles.row}
        >
          <Text style={typography.heading}>{item.label}</Text>
          <Text style={[typography.caption, { color: colors.textMuted }]}>{item.sub}</Text>
        </FocusableItem>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  title: { marginBottom: spacing.xl },
  row: {
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
})
