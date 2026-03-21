import { Capacitor } from '@capacitor/core'

export function isNativePlatform() {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}
