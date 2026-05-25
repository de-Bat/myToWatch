// apps/mobile/app/(app)/settings/users.tsx
import React from 'react'
import { View, Text, StyleSheet, FlatList, Alert, ActivityIndicator } from 'react-native'
import { useUsers, useUpdateUserRole, useDeleteUser } from '../../../src/lib/queries'
import { FocusableItem } from '../../../src/components/FocusableItem'
import { colors, typography, spacing } from '../../../src/design/tokens'
import { useAuthStore } from '../../../src/lib/authStore'

export default function UsersScreen() {
  const { data: users, isLoading } = useUsers()
  const updateRole = useUpdateUserRole()
  const deleteUser = useDeleteUser()
  const myId = useAuthStore((s) => s.userId)

  const handleRoleToggle = (id: string, currentRole: 'ADMIN' | 'VIEWER') => {
    const newRole = currentRole === 'ADMIN' ? 'VIEWER' : 'ADMIN'
    Alert.alert('Change Role', `Set role to ${newRole}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Confirm', onPress: () => updateRole.mutate({ id, role: newRole }) },
    ])
  }

  const handleDelete = (id: string, email: string) => {
    if (id === myId) { Alert.alert('Error', 'Cannot delete your own account.'); return }
    Alert.alert('Delete User', `Delete ${email}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteUser.mutate(id) },
    ])
  }

  if (isLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
  }

  return (
    <View style={styles.container}>
      <Text style={[typography.displayLg, styles.title]}>Users</Text>
      <FlatList
        data={users ?? []}
        keyExtractor={(u) => u.id}
        renderItem={({ item: u }) => (
          <View style={styles.row}>
            <View style={styles.info}>
              <Text style={typography.body}>{u.email}</Text>
              <Text style={[typography.caption, { color: u.role === 'ADMIN' ? colors.accent : colors.textMuted }]}>
                {u.role}
              </Text>
            </View>
            {u.id !== myId && (
              <>
                <FocusableItem onPress={() => handleRoleToggle(u.id, u.role)} style={styles.btn}>
                  <Text style={styles.btnText}>{u.role === 'ADMIN' ? 'Make Viewer' : 'Make Admin'}</Text>
                </FocusableItem>
                <FocusableItem onPress={() => handleDelete(u.id, u.email)} style={[styles.btn, styles.deleteBtn]}>
                  <Text style={styles.btnText}>Delete</Text>
                </FocusableItem>
              </>
            )}
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.xl },
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', alignItems: 'center' },
  title: { marginBottom: spacing.xl },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard, borderRadius: 12, padding: spacing.lg, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border, gap: spacing.md },
  info: { flex: 1 },
  btn: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  deleteBtn: { backgroundColor: 'rgba(239,68,68,0.2)' },
  btnText: { color: colors.text, fontWeight: '600' },
})
