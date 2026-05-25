// apps/mobile/src/components/ProgressBar.tsx
import React from 'react'
import { View, StyleSheet } from 'react-native'
import { colors } from '../design/tokens'

interface Props {
  progress: number // 0–1
  height?: number
}

export function ProgressBar({ progress, height = 4 }: Props) {
  const clamped = Math.max(0, Math.min(1, progress))
  return (
    <View style={[styles.track, { height }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  )
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 4,
  },
})
