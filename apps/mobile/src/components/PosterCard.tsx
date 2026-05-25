// apps/mobile/src/components/PosterCard.tsx
import React from 'react'
import { View, Text, Image, StyleSheet } from 'react-native'
import { FocusableItem } from './FocusableItem'
import { colors, typography, cardSize, spacing } from '../design/tokens'
import type { Media } from '@mytowatch/shared'

interface Props {
  media: Pick<Media, 'id' | 'title' | 'poster' | 'type'>
  onPress: () => void
  hasTVPreferredFocus?: boolean
  progress?: number // 0–1
}

export function PosterCard({ media, onPress, hasTVPreferredFocus, progress }: Props) {
  return (
    <FocusableItem
      onPress={onPress}
      hasTVPreferredFocus={hasTVPreferredFocus}
      style={styles.card}
    >
      {media.poster ? (
        <Image
          source={{ uri: media.poster }}
          style={styles.poster}
          resizeMode="cover"
        />
      ) : (
        <View style={[styles.poster, styles.posterPlaceholder]}>
          <Text style={typography.caption}>{media.type}</Text>
        </View>
      )}
      {progress !== undefined && progress > 0 && (
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      )}
      <Text style={[typography.caption, styles.title]} numberOfLines={2}>
        {media.title}
      </Text>
    </FocusableItem>
  )
}

const styles = StyleSheet.create({
  card: {
    width: cardSize.poster.width,
    marginRight: spacing.sm,
  },
  poster: {
    width: cardSize.poster.width,
    height: cardSize.poster.height,
    borderRadius: 6,
    backgroundColor: colors.bgCard,
  },
  posterPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.border,
    marginTop: 2,
    borderRadius: 2,
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.accent,
    borderRadius: 2,
  },
  title: {
    marginTop: spacing.xs,
  },
})
