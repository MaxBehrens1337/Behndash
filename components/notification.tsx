"use client"

import type React from "react"
import { createContext, useContext, useCallback, useState } from "react"
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react"

type NotificationType = "success" | "error" | "info" | "warning"

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  duration?: number
}

interface NotificationContextType {
  notifications: Notification[]
  showNotification: (notification: Omit<Notification, "id">) => void
  hideNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((notification: Omit<Notification, "id">) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newNotification = { ...notification, id }

    setNotifications((prev) => [...prev, newNotification])

    if (notification.duration !== 0) {
      setTimeout(() => {
        hideNotification(id)
      }, notification.duration || 5000)
    }
  }, [])

  const hideNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, hideNotification }}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider")
  }
  return context
}

function NotificationContainer() {
  const { notifications, hideNotification } = useNotification()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`flex items-start p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-y-0 opacity-100 ${
            notification.type === "success"
              ? "bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500"
              : notification.type === "error"
                ? "bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500"
                : notification.type === "warning"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500"
                  : "bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500"
          }`}
        >
          <div className="flex-shrink-0 mr-3">
            {notification.type === "success" ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : notification.type === "error" ? (
              <AlertCircle className="h-5 w-5 text-red-500" />
            ) : notification.type === "warning" ? (
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
            ) : (
              <Info className="h-5 w-5 text-blue-500" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p
                className={`text-sm font-medium ${
                  notification.type === "success"
                    ? "text-green-800 dark:text-green-300"
                    : notification.type === "error"
                      ? "text-red-800 dark:text-red-300"
                      : notification.type === "warning"
                        ? "text-yellow-800 dark:text-yellow-300"
                        : "text-blue-800 dark:text-blue-300"
                }`}
              >
                {notification.title}
              </p>
              <button
                onClick={() => hideNotification(notification.id)}
                className="ml-4 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{notification.message}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
