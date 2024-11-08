import React from 'react'
import { Switch } from './Switch'
import { Label } from './Label'

interface SwitchWithLabelProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

const SwitchWithLabel: React.FC<SwitchWithLabelProps> = ({
  label,
  checked,
  onCheckedChange,
  className = '',
  disabled = false,
}) => {
  return (
    <div className={`switch-with-label ${className}`}>
      <Switch 
        id={label} 
        checked={checked} 
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <Label htmlFor={label} className="switch-label">{label}</Label>
    </div>
  )
}

export { SwitchWithLabel }
