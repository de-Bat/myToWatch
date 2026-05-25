// apps/mobile/app/(app)/media/[id].tsx
import React from 'react'
import {
  View, Text, Image, ScrollView, StyleSheet,
  ActivityIndicator, Alert, Platform, Linking,
} from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../../src/lib/api'
import { useAddToWatchlist, useMediaProviders, useProgress } from '../../../src/lib/queries'
import { ProviderChip } from '../../../src/components/ProviderChip'
import { ProgressBar } from '../../../src/components/ProgressBar'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing, cardSize } from '../../../src/design/tokens'
import type { Media } from '@mytowatch/shared'
import type { ProviderAvailability } from '../../../src/lib/queries'

export default function MediaDetailScreen() {
  const rawParams = useLocalSearchParams<{ id: string }>()
  const rawId = rawParams.id
  const id = Array.isArray(rawId) ? rawId[0] : rawId
  const addToWatchlist = useAddToWatchlist()

  const { data: mediaRecord, isLoading: mediaLoading } = useQuery({
    queryKey: ['media-by-tmdb', id],
    queryFn: async () => {
      // If it looks like a DB ID (cuid) use it directly; otherwise search by tmdbId
      const isCuid = /^[a-z0-9]{20,}$/.test(id ?? '')
      if (isCuid) {
        return api.get<Media>(`/media/${id}`)
      }
      const results = await api.get<Media[]>(`/media/search?q=${encodeURIComponent(id ?? '')}`)
      return results.find((r) => r.tmdbId === id) ?? results[0] ?? null
    },
    enabled: !!id,
  })

  const dbId = mediaRecord?.id
  const { data: providers, isLoading: providersLoading } = useMediaProviders(dbId ?? '')
  const { data: progress } = useProgress(dbId ?? '')

  const handlePlay = async (deepLink: string) => {
    const canOpen = await Linking.canOpenURL(deepLink)
    if (canOpen) {
      await Linking.openURL(deepLink)
    } else {
      Alert.alert('Cannot open', 'The provider app is not installed on this device.')
    }
  }

  const handleAddToWatchlist = async () => {
    if (!mediaRecord) return
    try {
      await addToWatchlist.mutateAsync({
        tmdbId: mediaRecord.tmdbId,
        type: mediaRecord.type,
        title: mediaRecord.title,
      })
      Alert.alert('Added', `"${mediaRecord.title}" added to your watchlist.`)
    } catch {
      Alert.alert('Error', 'Failed to add to watchlist.')
    }
  }

  if (mediaLoading || !mediaRecord) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  const meta = mediaRecord.metadata

  const progressFraction =
    progress && meta.runtime
      ? Math.min(1, progress.positionSec / (meta.runtime * 60))
      : 0

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        {mediaRecord.poster ? (
          <Image source={{ uri: mediaRecord.poster }} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterPlaceholder]} />
        )}

        <View style={styles.info}>
          <Text style={typography.displayLg}>{mediaRecord.title}</Text>
          <Text style={[typography.caption, styles.meta]}>
            {[meta.year, mediaRecord.type === 'MOVIE' ? `${meta.runtime ?? '?'} min` : `${meta.episodeCount ?? '?'} eps`]
              .filter(Boolean).join('  ·  ')}
          </Text>
          {meta.rating !== undefined && (
            <Text style={[typography.body, styles.rating]}>
              ★ {meta.rating.toFixed(1)}{meta.imdbRating ? `  ·  IMDb ${meta.imdbRating.toFixed(1)}` : ''}
            </Text>
          )}
          {meta.genres && meta.genres.length > 0 && (
            <Text style={[typography.caption, { color: colors.textMuted }]}>
              {meta.genres.join(' · ')}
            </Text>
          )}
          {progressFraction > 0 && (
            <View style={{ marginTop: spacing.md, width: 240 }}>
              <ProgressBar progress={progressFraction} height={6} />
            </View>
          )}

          <View style={styles.actions}>
            <FocusableItem
              onPress={handleAddToWatchlist}
              hasTVPreferredFocus
              style={styles.btn}
            >
              <Text style={styles.btnText}>+ Watchlist</Text>
            </FocusableItem>
          </View>
        </View>
      </View>

      {meta.synopsis && (
        <View style={styles.section}>
          <Text style={[typography.heading, styles.sectionTitle]}>Synopsis</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>{meta.synopsis}</Text>
        </View>
      )}

      {meta.cast && meta.cast.length > 0 && (
        <View style={styles.section}>
          <Text style={[typography.heading, styles.sectionTitle]}>Cast</Text>
          <Text style={[typography.body, { color: colors.textMuted }]}>
            {meta.cast.slice(0, 8).join(', ')}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={[typography.heading, styles.sectionTitle]}>Available On</Text>
        {providersLoading ? (
          <ActivityIndicator color={colors.accent} />
        ) : providers && providers.length > 0 ? (
          <View style={styles.chips}>
            {providers.map((p: ProviderAvailability) => (
              <ProviderChip
                key={p.providerId}
                providerName={p.providerName}
                status={p.availability.status}
                deepLink={p.deepLink}
                onPlay={p.deepLink ? () => handlePlay(p.deepLink!) : undefined}
              />
            ))}
          </View>
        ) : (
          <Text style={[typography.body, { color: colors.textMuted }]}>
            No providers configured. Add providers in Settings.
          </Text>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  hero: {
    flexDirection: Platform.isTV ? 'row' : 'column',
    marginBottom: spacing.xl,
    gap: spacing.xl,
  },
  poster: {
    width: Platform.isTV ? cardSize.poster.width * 1.5 : '100%',
    height: Platform.isTV ? cardSize.poster.height * 1.5 : 300,
    borderRadius: 12,
    backgroundColor: colors.bgCard,
  },
  posterPlaceholder: { backgroundColor: colors.bgCard },
  info: { flex: 1, justifyContent: 'flex-start' },
  meta: { color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.sm },
  rating: { color: colors.warning, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.md },
  btn: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: 8,
  },
  btnText: { color: colors.text, fontWeight: '700', fontSize: Platform.isTV ? 18 : 16 },
  section: { marginBottom: spacing.xl },
  sectionTitle: { marginBottom: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap' },
})
