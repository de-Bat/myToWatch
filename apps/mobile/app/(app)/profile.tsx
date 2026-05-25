// apps/mobile/app/(app)/profile.tsx
import React from 'react'
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useWatchlist, useSyncProgress } from '../../src/lib/queries'
import { useAuthStore } from '../../src/lib/authStore'
import { FocusableItem } from '../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../src/design/tokens'

export default function ProfileScreen() {
  const router = useRouter()
  const { logout, role } = useAuthStore()
  const { data: watchlist } = useWatchlist()
  const syncProgress = useSyncProgress()

  const items = watchlist ?? []
  const done = items.filter((w) => w.status === 'DONE').length
  const watching = items.filter((w) => w.status === 'WATCHING').length
  const plan = items.filter((w) => w.status === 'PLAN').length

  const handleSync = async () => {
    try {
      const result = await syncProgress.mutateAsync()
      Alert.alert('Sync Complete', `Synced ${result.synced} progress record${result.synced === 1 ? '' : 's'} from providers.`)
    } catch {
      Alert.alert('Sync Failed', 'Could not sync progress. Check provider settings.')
    }
  }

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Sign out of myToWatch?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/login') } },
    ])
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={[typography.displayLg, styles.title]}>Profile</Text>

      <View style={styles.statsRow}>
        {[
          { label: 'Watching', value: watching },
          { label: 'Completed', value: done },
          { label: 'Plan to Watch', value: plan },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={[typography.displayLg, { color: colors.accent }]}>{stat.value}</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <FocusableItem
          onPress={handleSync}
          hasTVPreferredFocus
          style={styles.actionRow}
        >
          <View style={styles.actionInfo}>
            <Text style={typography.heading}>Sync Progress</Text>
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              Pull watch progress from Jellyfin
            </Text>
          </View>
          {syncProgress.isPending
            ? <ActivityIndicator color={colors.accent} />
            : <Text style={[typography.body, { color: colors.accent }]}>Sync ↻</Text>
          }
        </FocusableItem>

        {role === 'ADMIN' && (
          <FocusableItem onPress={() => router.push('/(app)/settings/')} style={styles.actionRow}>
            <Text style={typography.heading}>Settings</Text>
          </FocusableItem>
        )}

        <FocusableItem onPress={handleLogout} style={[styles.actionRow, styles.logoutRow]}>
          <Text style={[typography.heading, { color: colors.error }]}>Sign Out</Text>
        </FocusableItem>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { marginBottom: spacing.xl },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  section: { gap: spacing.md },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgCard,
    borderRadius: 12,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionInfo: { flex: 1 },
  logoutRow: { borderColor: 'rgba(239,68,68,0.3)' },
})
