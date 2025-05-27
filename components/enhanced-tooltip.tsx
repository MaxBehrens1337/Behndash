"use client"

import React from "react"

import { useState, useRef, useEffect } from "react"

interface EnhancedTooltipProps {
  content: string | React.ReactNode
  children: React.ReactElement
  position?: "top" | "bottom" | "left" | "right"
  delay?: number
  className?: string
}

export function EnhancedTooltip({
  content,
  children,
  position = "top",
  delay = 300,
  className = "",
}: EnhancedTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [coords, setCoords] = useState({ x: 0, y: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const childRef = useRef<HTMLElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
      updatePosition()
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setIsVisible(false)
  }

  const updatePosition = () => {
    if (!childRef.current || !tooltipRef.current) return

    const childRect = childRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()

    let x = 0
    let y = 0

    switch (position) {
      case "top":
        x = childRect.left + childRect.width / 2 - tooltipRect.width / 2
        y = childRect.top - tooltipRect.height - 8
        break
      case "bottom":
        x = childRect.left + childRect.width / 2 - tooltipRect.width / 2
        y = childRect.bottom + 8
        break
      case "left":
        x = childRect.left - tooltipRect.width - 8
        y = childRect.top + childRect.height / 2 - tooltipRect.height / 2
        break
      case "right":
        x = childRect.right + 8
        y = childRect.top + childRect.height / 2 - tooltipRect.height / 2
        break
    }

    // Ensure tooltip stays within viewport
    x = Math.max(10, Math.min(x, window.innerWidth - tooltipRect.width - 10))
    y = Math.max(10, Math.min(y, window.innerHeight - tooltipRect.height - 10))

    setCoords({ x, y })
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  useEffect(() => {
    if (isVisible) {
      updatePosition()
      window.addEventListener("resize", updatePosition)
      window.addEventListener("scroll", updatePosition)
    }

    return () => {
      window.removeEventListener("resize", updatePosition)
      window.removeEventListener("scroll", updatePosition)
    }
  }, [isVisible])

  const clonedChild = children
    ? React.cloneElement(children, {
        ref: childRef,
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
        onFocus: showTooltip,
        onBlur: hideTooltip,
      })
    : null

  return (
    <>
      {clonedChild}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`fixed z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 dark:bg-gray-700 rounded shadow-lg pointer-events-none transition-opacity duration-200 ${className}`}
          style={{
            left: `${coords.x}px`,
            top: `${coords.y}px`,
          }}
        >
          {content}
          <div
            className={`absolute w-2 h-2 bg-gray-900 dark:bg-gray-700 transform rotate-45 ${
              position === "top"
                ? "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2"
                : position === "bottom"
                  ? "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  : position === "left"
                    ? "right-0 top-1/2 translate-x-1/2 -translate-y-1/2"
                    : "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2"
            }`}
          />
        </div>
      )}
    </>
  )
}
