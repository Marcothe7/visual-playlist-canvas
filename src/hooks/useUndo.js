import { useAppState, useAppDispatch } from '@/context/AppContext'

export function useUndo() {
  const { deletedSnapshot } = useAppState()
  const dispatch = useAppDispatch()

  function undo() {
    dispatch({ type: 'UNDO_DELETE' })
  }

  function clearSnapshot() {
    dispatch({ type: 'CLEAR_UNDO_SNAPSHOT' })
  }

  return {
    canUndo:      deletedSnapshot !== null,
    deletedCount: deletedSnapshot?.length ?? 0,
    undo,
    clearSnapshot,
  }
}
