import { createFileRoute } from "@tanstack/react-router"

import FilesPage from "@/routes/_layout/files";

export const Route = createFileRoute("/_layout/")({
  component: Dashboard,
})

function Dashboard() {
  return <FilesPage />
}
