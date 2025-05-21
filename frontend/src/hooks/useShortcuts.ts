import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { type ApiError, type ShortcutsPublic, ShortcutsService } from "@/client"
import { handleError } from "@/utils"

const LS_KEY = "shortcuts"

function readLS(): ShortcutsPublic | undefined {
  if (typeof window === "undefined") return undefined
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as ShortcutsPublic) : undefined
  } catch {
    return undefined
  }
}

function writeLS(data: ShortcutsPublic) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data))
  } catch {
    /* ignore quota / serialise errors */
  }
}

function clearLS() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    /* ignore */
  }
}

export const useShortcuts = () => {
  const queryClient = useQueryClient()

  const { data, isFetching: isLoading } = useQuery<ShortcutsPublic>({
    queryKey: ["shortcuts"],
    queryFn: () => ShortcutsService.getShortcuts(),
    initialData: readLS() ?? ({} as ShortcutsPublic), // must be defined
  })

  useEffect(() => {
    if (data) writeLS(data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (payload: ShortcutsPublic) =>
      ShortcutsService.setShortcuts({ requestBody: payload }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["shortcuts"], updated)
      writeLS(updated)
    },
    onError: (err: ApiError) => handleError(err),
  })

  const resetMutation = useMutation({
    mutationFn: () => ShortcutsService.deleteShortcuts(),
    onSuccess: () => {
      queryClient.setQueryData(["shortcuts"], {} as ShortcutsPublic)
      clearLS()
    },
    onError: (err: ApiError) => handleError(err),
  })

  return {
    shortcuts: data ?? ({} as ShortcutsPublic),
    isLoading,
    saveShortcuts: saveMutation.mutate,
    resetShortcuts: resetMutation.mutate,
    isSaving: saveMutation.isPending,
    isResetting: resetMutation.isPending,
  }
}
