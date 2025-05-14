"use client"

import { toaster } from "@/components/ui/toaster"

const useCustomToast = () => {
  const showSuccessToast = (description: string) => {
    toaster.create({
      title: "Success!",
      description,
      type: "success",
      closable: true,
    })
    toaster.attrs.placement = "bottom-end"
  }

  const showErrorToast = (description: string) => {
    toaster.create({
      title: "Something went wrong!",
      description,
      type: "error",
      closable: true,
    })
    toaster.attrs.placement = "bottom-end"
  }

  return { showSuccessToast, showErrorToast }
}

export default useCustomToast
