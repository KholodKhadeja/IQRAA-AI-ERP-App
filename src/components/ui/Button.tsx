import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Button.module.css'

type Variant = 'primary' | 'secondary' | 'ghost'

interface CommonProps {
  variant?: Variant
  fullWidth?: boolean
  children: ReactNode
  icon?: ReactNode
}

type ButtonAsButton = CommonProps &
  ButtonHTMLAttributes<HTMLButtonElement> & {
    to?: undefined
  }

type ButtonAsLink = CommonProps & {
  to: string
  href?: undefined
  onClick?: MouseEventHandler<HTMLAnchorElement>
}

type ButtonProps = ButtonAsButton | ButtonAsLink

export function Button(props: ButtonProps) {
  const { variant = 'primary', fullWidth, children, icon } = props
  const className = [styles.button, styles[variant], fullWidth ? styles.fullWidth : '']
    .filter(Boolean)
    .join(' ')

  if ('to' in props && props.to) {
    return (
      <Link to={props.to} className={className} onClick={props.onClick}>
        {icon}
        {children}
      </Link>
    )
  }

  const { variant: _variant, fullWidth: _fullWidth, icon: _icon, children: _children, type = 'button', ...rest } =
    props as ButtonAsButton
  return (
    <button type={type} className={className} {...rest}>
      {icon}
      {children}
    </button>
  )
}
