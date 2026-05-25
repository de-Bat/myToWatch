// apps/mobile/app/(app)/settings/providers-form.tsx
import React, { useState } from 'react'
import {
  View, Text, TextInput, ScrollView, StyleSheet, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useCreateProvider } from '../../../src/lib/queries'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'

const PLUGIN_OPTIONS = [
  { key: 'jellyfin', label: 'Jellyfin', fields: [
    { name: 'serverUrl', label: 'Server URL', placeholder: 'http://192.168.1.10:8096', secret: false },
    { name: 'apiKey', label: 'API Key', placeholder: 'From Dashboard → API Keys', secret: true },
    { name: 'jellyfinUserId', label: 'User ID', placeholder: 'From Dashboard → Users → click user', secret: false },
  ]},
  { key: 'netflix', label: 'Netflix', fields: [] },
]

export default function ProvidersFormScreen() {
  const router = useRouter()
  const createProvider = useCreateProvider()
  const [selectedPlugin, setSelectedPlugin] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [config, setConfig] = useState<Record<string, string>>({})

  const plugin = PLUGIN_OPTIONS.find((p) => p.key === selectedPlugin)

  const handleSave = async () => {
    if (!selectedPlugin || !name) {
      Alert.alert('Required', 'Enter a name and select a plugin.')
      return
    }
    try {
      await createProvider.mutateAsync({ name, pluginKey: selectedPlugin, config })
      router.back()
    } catch {
      Alert.alert('Error', 'Failed to create provider.')
    }
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={[typography.displayLg, styles.title]}>Add Provider</Text>

      <Text style={[typography.heading, styles.label]}>Plugin</Text>
      <View style={styles.pluginRow}>
        {PLUGIN_OPTIONS.map((p) => (
          <FocusableItem
            key={p.key}
            onPress={() => { setSelectedPlugin(p.key); setConfig({}) }}
            style={[styles.pluginChip, selectedPlugin === p.key && styles.pluginChipActive]}
          >
            <Text style={[typography.body, selectedPlugin === p.key && { color: colors.accent }]}>
              {p.label}
            </Text>
          </FocusableItem>
        ))}
      </View>

      <Text style={[typography.heading, styles.label]}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Jellyfin Home Server"
        placeholderTextColor={colors.textMuted}
      />

      {plugin?.fields.map((f) => (
        <View key={f.name}>
          <Text style={[typography.heading, styles.label]}>{f.label}</Text>
          <TextInput
            style={styles.input}
            value={config[f.name] ?? ''}
            onChangeText={(v) => setConfig((c) => ({ ...c, [f.name]: v }))}
            placeholder={f.placeholder}
            placeholderTextColor={colors.textMuted}
            secureTextEntry={f.secret}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ))}

      {plugin && (
        <FocusableItem
          onPress={handleSave}
          style={styles.saveBtn}
          hasTVPreferredFocus
        >
          {createProvider.isPending
            ? <ActivityIndicator color={colors.text} />
            : <Text style={styles.saveBtnText}>Save Provider</Text>
          }
        </FocusableItem>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  title: { marginBottom: spacing.xl },
  label: { marginBottom: spacing.sm, marginTop: spacing.md },
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
  pluginRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  pluginChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgCard,
  },
  pluginChipActive: { borderColor: colors.accent, backgroundColor: colors.bgCardFocused },
  saveBtn: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    padding: spacing.md,
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  saveBtnText: { color: colors.text, fontWeight: '700', fontSize: 16 },
})
