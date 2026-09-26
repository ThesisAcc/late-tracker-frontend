import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'

beforeAll(() => {
  const dialogProto = window.HTMLDialogElement?.prototype

  if (dialogProto && typeof dialogProto.showModal !== 'function') {
    // Mirrors the browser closely enough for these tests, and deliberately does
    // NOT move focus: Chrome skips its implicit first-focusable heuristic for
    // dialogs opened from a React commit, so the component must focus itself.
    dialogProto.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true
    }
  }

  if (dialogProto && typeof dialogProto.close !== 'function') {
    dialogProto.close = function close(this: HTMLDialogElement) {
      this.open = false
    }
  }
})

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})
