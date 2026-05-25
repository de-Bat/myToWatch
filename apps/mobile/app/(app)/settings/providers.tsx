// apps/mobile/app/(app)/settings/providers.tsx
import React, { useState } from 'react'
import {
  View, Text, StyleSheet, FlatList, Alert, ActivityIndicator, Switch,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useProviders, useUpdateProvider, useDeleteProvider } from '../../../src/lib/queries'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'
import type { ProviderRow } from '../../../src/lib/queries'

export default function ProvidersScreen() {
  const router = useRouter()
  const { data: providers, isLoading } = useProviders()
  const updateProvider = useUpdateProvider()
  const deleteProvider = useDeleteProvider()
  const [testingId, setTestingId] = useState<string | null>(null)

  const handleTest = async (p: ProviderRow) => {
    setTestingId(p.id)
    try {
      const result = await updateProvider.mutateAsync({ id: p.id, action: 'test' }) as { ok: boolean; message: string }
      Alert.alert(result.ok ? '✅ Connected' : '❌ Failed', result.message)
    } catch {
      Alert.alert('Error', 'Test failed')
    } finally {
      setTestingId(null)
    }
  }

  const handleDelete = (p: ProviderRow) => {
    Alert.alert('Remove Provider', `Remove "${p.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => deleteProvider.mutate(p.id) },
    ])
  }

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.displayLg]}>Providers</Text>
        <FocusableItem
          onPress={() => router.push('/(app)/settings/providers-form')}
          style={styles.addBtn}
        >
          <Text style={styles.addBtnText}>+ Add Provider</Text>
        </FocusableItem>
      </View>

      <FlatList
        data={providers ?? []}
        keyExtractor={(p) => p.id}
        ListEmptyComponent={
          <Text style={[typography.body, { color: colors.textMuted }]}>
            No providers configured. Add Jellyfin or Netflix to enable playback.
          </Text>
        }
        renderItem={({ item: p }) => (
          <View style={styles.row}>
            <View style={styles.rowInfo}>
              <Text style={typography.heading}>{p.name}</Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>{p.pluginKey}</Text>
            </View>
            <Switch
              value={p.enabled}
              onValueChange={(v) => updateProvider.mutate({ id: p.id, enabled: v })}
              trackColor={{ false: colors.border, true: colors.accent }}
            />
            <FocusableItem
              onPress={() => handleTest(p)}
              style={styles.smallBtn}
            >
              {testingId === p.id
                ? <ActivityIndicator color={colors.text} size="small" />
                : <Text style={styles.smallBtnText}>Test</Text>
              }
            </FocusableItem>
            <FocusableItem onPress={() => handleDelete(p)} style={[styles.smallBtn, styles.deleteBtn]}>
              <Text style={styles.smallBtnText}>✕</Text>
            </FocusableItem>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  addBtn: { backgroundColor: colors.accent, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 8 },
  addBtnText: { color: colors.text, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  rowInfo: { flex: 1 },
  smallBtn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: spacing.sm, minWidth: 48, alignItems: 'center' },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.2)' },
  smallBtnText: { color: colors.text, fontWeight: '600' },
})
