import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Rendered instead of the children if they throw (default: nothing). */
  fallback?: ReactNode
}

/**
 * Minimal error boundary. Used to guard the WebGPU login hero: if the renderer
 * fails to initialise on a browser that merely *claims* WebGPU support, we fall
 * back gracefully (to the static photo underneath) instead of breaking login.
 */
export default class ErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    /* swallow - the fallback UI is enough */
  }

  render() {
    if (this.state.failed) return this.props.fallback ?? null
    return this.props.children
  }
}
