import { useEffect } from 'react'
import { useAppState, useAppDispatch } from '@/context/AppContext'
import { useUndo } from '@/hooks/useUndo'
import { useSongs } from '@/hooks/useSongs'

export function useKeyboardShortcuts() {
  const { isPanelOpen, isModalOpen } = useAppState()
  const dispatch = useAppDispatch()
  const { canUndo, undo } = useUndo()
  const { selectedCount } = useSongs()

  useEffect(() => {
    function handleKeyDown(e) {
      // Don't fire shortcuts while the user is typing in an input
      const tag = document.activeElement?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // Escape: close recommendations panel (not when modal is open)
      if (e.key === 'Escape' && isPanelOpen && !isModalOpen) {
        dispatch({ type: 'CLOSE_PANEL' })
        return
      }

      // Delete / Backspace: delete selected songs
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCount > 0) {
        e.preventDefault()
        dispatch({ type: 'DELETE_SELECTED' })
        return
      }

      // Ctrl+Z / Cmd+Z: undo last delete
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        if (canUndo) undo()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPanelOpen, isModalOpen, selectedCount, canUndo, dispatch, undo])
}
