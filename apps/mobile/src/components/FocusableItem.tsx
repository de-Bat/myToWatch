// apps/mobile/src/components/FocusableItem.tsx
import React, { useState, useCallback } from 'react'
import { Pressable, PressableProps, StyleSheet, ViewStyle } from 'react-native'
import { colors } from '../design/tokens'

interface Props extends PressableProps {
  style?: ViewStyle
  focusedStyle?: ViewStyle
  hasTVPreferredFocus?: boolean
}

export function FocusableItem({ style, focusedStyle, hasTVPreferredFocus, children, ...rest }: Props) {
  const [focused, setFocused] = useState(false)

  const handleFocus = useCallback(() => setFocused(true), [])
  const handleBlur = useCallback(() => setFocused(false), [])

  return (
    <Pressable
      {...rest}
      hasTVPreferredFocus={hasTVPreferredFocus}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={[
        styles.base,
        style,
        focused && styles.focused,
        focused && focusedStyle,
      ]}
    >
      {children}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  focused: {
    borderColor: colors.borderFocused,
    backgroundColor: colors.bgCardFocused,
  },
})
