// apps/mobile/src/components/RowSection.tsx
import React from 'react'
import { View, Text, ScrollView, StyleSheet } from 'react-native'
import { typography, spacing } from '../design/tokens'

interface Props {
  title: string
  children: React.ReactNode
}

export function RowSection({ title, children }: Props) {
  return (
    <View style={styles.section}>
      <Text style={[typography.heading, styles.heading]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {children}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  heading: {
    marginBottom: spacing.md,
  },
  row: {
    paddingBottom: spacing.sm,
  },
})
