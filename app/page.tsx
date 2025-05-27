import FestivalDashboard from "@/components/festival-dashboard"
import { ThemeProvider } from "@/contexts/theme-context"
import { NotificationProvider } from "@/components/notification"

export default function Home() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <FestivalDashboard />
      </NotificationProvider>
    </ThemeProvider>
  )
}
