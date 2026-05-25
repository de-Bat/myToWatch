// apps/mobile/app/(app)/index.tsx
import React from 'react'
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native'
import { useRouter } from 'expo-router'
import { useWatchlist } from '../../src/lib/queries'
import { PosterCard } from '../../src/components/PosterCard'
import { RowSection } from '../../src/components/RowSection'
import { colors, typography, spacing, TV_OVERSCAN } from '../../src/design/tokens'
import type { WatchlistItem } from '@mytowatch/shared'

export default function HomeScreen() {
  const router = useRouter()
  const { data: watchlist, isLoading, refetch, isRefetching } = useWatchlist()

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    )
  }

  const items = watchlist ?? []
  const continueWatching = items.filter((w) => w.status === 'WATCHING')
  const planToWatch = items.filter((w) => w.status === 'PLAN')
  const recentlyAdded = [...items]
    .sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
    .slice(0, 20)

  const navigateToMedia = (item: WatchlistItem) =>
    router.push({ pathname: '/(app)/media/[id]', params: { id: item.mediaId } })

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accent} />}
    >
      <Text style={[typography.displayLg, styles.pageTitle]}>myToWatch</Text>

      {continueWatching.length > 0 && (
        <RowSection title="Continue Watching">
          {continueWatching.map((w, idx) => (
            <PosterCard
              key={w.id}
              media={{ id: w.mediaId, title: w.media?.title ?? '—', poster: w.media?.poster ?? null, type: w.media?.type ?? 'MOVIE' }}
              onPress={() => navigateToMedia(w)}
              hasTVPreferredFocus={idx === 0}
            />
          ))}
        </RowSection>
      )}

      {planToWatch.length > 0 && (
        <RowSection title="Plan to Watch">
          {planToWatch.map((w, idx) => (
            <PosterCard
              key={w.id}
              media={{ id: w.mediaId, title: w.media?.title ?? '—', poster: w.media?.poster ?? null, type: w.media?.type ?? 'MOVIE' }}
              onPress={() => navigateToMedia(w)}
              hasTVPreferredFocus={continueWatching.length === 0 && idx === 0}
            />
          ))}
        </RowSection>
      )}

      {recentlyAdded.length > 0 && (
        <RowSection title="Recently Added">
          {recentlyAdded.slice(0, 10).map((w) => (
            <PosterCard
              key={w.id}
              media={{ id: w.mediaId, title: w.media?.title ?? '—', poster: w.media?.poster ?? null, type: w.media?.type ?? 'MOVIE' }}
              onPress={() => navigateToMedia(w)}
            />
          ))}
        </RowSection>
      )}

      {items.length === 0 && (
        <View style={styles.empty}>
          <Text style={typography.heading}>Your watchlist is empty</Text>
          <Text style={[typography.body, { color: colors.textMuted, marginTop: spacing.sm }]}>
            Search for movies and TV shows to add them.
          </Text>
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingLeft: spacing.xl + TV_OVERSCAN },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  pageTitle: { marginBottom: spacing.xl },
  empty: { marginTop: spacing.xxl, alignItems: 'center' },
})
