// apps/mobile/app/(app)/search.tsx
import React, { useState, useCallback } from 'react'
import { View, Text, TextInput, FlatList, StyleSheet, ActivityIndicator, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { useSearch } from '../../src/lib/queries'
import { PosterCard } from '../../src/components/PosterCard'
import { colors, typography, spacing, TV_OVERSCAN } from '../../src/design/tokens'
import type { Media } from '@mytowatch/shared'

export default function SearchScreen() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const { data: results, isLoading } = useSearch(query)

  const navigate = useCallback(
    (media: Media) =>
      router.push({ pathname: '/(app)/media/[id]', params: { id: media.id || media.tmdbId } }),
    [router],
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.display, styles.pageTitle]}>Search</Text>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies & TV shows…"
          placeholderTextColor={colors.textMuted}
          autoCorrect={false}
          clearButtonMode="while-editing"
          returnKeyType="search"
          autoFocus={Platform.isTV}
        />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && results && results.length === 0 && query.length >= 2 && (
        <View style={styles.center}>
          <Text style={[typography.body, { color: colors.textMuted }]}>No results for "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results ?? []}
        keyExtractor={(item) => item.tmdbId}
        numColumns={Platform.isTV ? 6 : 3}
        contentContainerStyle={styles.grid}
        renderItem={({ item, index }) => (
          <PosterCard
            media={item}
            onPress={() => navigate(item)}
            hasTVPreferredFocus={index === 0}
          />
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  pageTitle: { marginBottom: spacing.md },
  input: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    color: colors.text,
    fontSize: Platform.isTV ? 20 : 16,
  },
  grid: {
    padding: spacing.xl,
    paddingLeft: spacing.xl + TV_OVERSCAN,
  },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: spacing.xxl },
})
