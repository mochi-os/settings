import { useState } from 'react'
import type React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import {
  cn,
  Button,
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@mochi/web'

interface ComboSelectProps {
  value: string
  options: Record<string, string>
  onChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  renderOption?: (optValue: string, label: string) => React.ReactNode
}

export function ComboSelect({ value, options, onChange, disabled, placeholder = 'Select...', renderOption }: ComboSelectProps) {
  const [open, setOpen] = useState(false)
  const displayValue = options[value] ?? value

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className='w-full justify-between'
          disabled={disabled}
        >
          <span className='truncate'>{displayValue || placeholder}</span>
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
      </PopoverTrigger>
      <PopoverContent className='w-[--radix-popover-trigger-width] p-0' align='start'>
        <Command>
          <CommandList>
            <CommandEmpty>No options found.</CommandEmpty>
            <CommandGroup>
              {Object.entries(options).map(([optValue, label]) => (
                <CommandItem
                  key={optValue}
                  value={optValue}
                  onSelect={() => {
                    onChange(optValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4 shrink-0',
                      value === optValue ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {renderOption ? renderOption(optValue, label) : <span className='truncate'>{label}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
