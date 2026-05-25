// apps/mobile/src/components/ProviderChip.tsx
import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { colors, typography, spacing } from '../design/tokens'

interface Props {
  providerName: string
  status: 'available' | 'unavailable' | 'unknown'
  deepLink: string | null
  onPlay?: () => void
}

export function ProviderChip({ providerName, status, deepLink, onPlay }: Props) {
  const statusColor = status === 'available' ? colors.success : status === 'unavailable' ? colors.error : colors.textMuted
  const canPlay = status === 'available' && deepLink && onPlay

  return (
    <View style={styles.chip}>
      <View style={[styles.dot, { backgroundColor: statusColor }]} />
      <Text style={[typography.caption, styles.name]}>{providerName}</Text>
      {canPlay && (
        <TouchableOpacity onPress={onPlay} style={styles.playBtn}>
          <Text style={[typography.caption, styles.playText]}>▶ Play</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgCard,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  name: {
    marginRight: spacing.sm,
  },
  playBtn: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  playText: {
    color: colors.text,
    fontWeight: '600',
  },
})
