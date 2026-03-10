// djb2 hash → deterministic HSL gradient per artist+album string
function hashString(str) {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i)
    hash = hash & hash // force 32-bit signed integer
  }
  return Math.abs(hash)
}

export function getGradientFromString(str) {
  const hash = hashString(str || 'unknown')
  const hue1 = hash % 360
  const hue2 = (hue1 + 40 + (hash % 80)) % 360
  const sat  = 55 + (hash % 25)    // 55–80%
  const lit  = 28 + (hash % 12)    // 28–40%
  return {
    from: `hsl(${hue1}, ${sat}%, ${lit}%)`,
    to:   `hsl(${hue2}, ${sat}%, ${lit + 8}%)`,
  }
}
