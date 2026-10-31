import { useState, type Ref } from "react"
import { Pressable, Text, TextInput, View, type TextInputProps } from "react-native"
import { usePalette } from "@/theme/palette"

interface FieldProps extends TextInputProps {
  label: string
  error?: string
  secureToggle?: boolean
  inputRef?: Ref<TextInput>
}

export function Field({ label, error, secureToggle = false, inputRef, secureTextEntry, ...input }: FieldProps) {
  const [hidden, setHidden] = useState(true)
  const colors = usePalette()

  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-sm text-foreground">{label}</Text>
      <View
        className={`flex-row items-center rounded-xl border bg-card ${error ? "border-destructive" : "border-input"}`}
      >
        <TextInput
          ref={inputRef}
          className="flex-1 px-4 py-3 font-sans text-base text-foreground"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          accessibilityLabel={label}
          {...input}
        />
        {secureToggle && (
          <Pressable
            onPress={() => setHidden((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? "Mostrar contraseña" : "Ocultar contraseña"}
            className="px-4 py-3"
          >
            <Text className="font-sans text-sm text-muted-foreground">{hidden ? "Mostrar" : "Ocultar"}</Text>
          </Pressable>
        )}
      </View>
      {error ? <Text className="font-sans text-sm text-destructive">{error}</Text> : null}
    </View>
  )
}
