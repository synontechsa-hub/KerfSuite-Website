'use client'

import { useFormStatus } from 'react-dom'
import styles from '../portal/page.module.css'

export default function SubmitButton({
  children,
  onClick,
  className,
  title,
  variant = 'primary',
  disabled: externalDisabled,
}: {
  children: React.ReactNode
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
  className?: string
  title?: string
  variant?: 'primary' | 'danger'
  disabled?: boolean
}) {
  const { pending } = useFormStatus()
  const isDisabled = pending || externalDisabled
  
  const baseClass = variant === 'danger' ? styles.btnDanger : 'btn-primary'
  const disabledClass = variant === 'danger' ? styles.btnDangerDisabled : ''

  return (
    <button
      type="submit"
      disabled={isDisabled}
      className={className || `${baseClass} ${isDisabled ? disabledClass : ''}`}
      onClick={onClick}
      title={title}
      style={isDisabled ? { opacity: 0.5, cursor: 'wait' } : {}}
    >
      {pending ? 'Processing...' : children}
    </button>
  )
}

