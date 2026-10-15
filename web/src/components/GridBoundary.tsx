import { Component, type ReactNode } from 'react'

/**
 * If an AG Studio view cannot start (not installed, bad licence, a browser problem), the page must keep
 * working, so it shows the fallback instead (a timeline or a plain table).
 */
export default class GridBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
