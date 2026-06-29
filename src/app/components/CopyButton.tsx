'use client'

import { useState } from 'react'
import styles from '../portal/page.module.css'

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault()
        navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      className={styles.copyBtn}
      title="Copy to clipboard"
    >
      {copied ? '✓' : '⧉'}
    </button>
  )
}

