"use client"

import { useEffect } from "react"
import { useResolvedTheme } from "@/lib/store"

const ThemeApplier = () => {
  const resolved = useResolvedTheme()
  useEffect(() => {
    document.documentElement.dataset.theme = resolved
  }, [resolved])
  return null
}

export default ThemeApplier
