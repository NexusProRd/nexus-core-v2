'use client'

import { useState, useMemo } from 'react'

interface Props {
  producto: { id: string; nombre: string; precio: number }
  monedaSimbolo: string
  onConfirm: (fecha: string, hora: string) => void
  onClose: () => void
}

const BLOQUES_HORARIOS = [
  '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
  '11:00 AM', '11:30 AM', '12:00 PM', '12:30 PM',
  '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM',
  '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM',
  '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM',
  '07:00 PM',
]

const DIAS_SEMANA = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

export default function ModalSeleccionCita({ producto, monedaSimbolo, onConfirm, onClose }: Props) {
  const hoy = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d }, [])
  const [mesOffset, setMesOffset] = useState(0)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedHour, setSelectedHour] = useState('')

  const mesActual = useMemo(() => {
    const d = new Date(hoy)
    d.setMonth(d.getMonth() + mesOffset)
    return d
  }, [hoy, mesOffset])

  const diasDelMes = useMemo(() => {
    const year = mesActual.getFullYear()
    const month = mesActual.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()
    const days: (Date | null)[] = []
    for (let i = 0; i < startPad; i++) days.push(null)
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d))
    return days
  }, [mesActual])

  const puedeNavegarAtras = mesOffset < 0 || (mesOffset === 0 && hoy.getDate() < 2)

  const handleConfirm = () => {
    if (!selectedDate || !selectedHour) return
    const fechaStr = `${DIAS_SEMANA[selectedDate.getDay()]} ${selectedDate.getDate()} de ${MESES[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
    onConfirm(fechaStr, selectedHour)
  }

  const isPastDay = (d: Date) => {
    const compare = new Date(d)
    compare.setHours(0, 0, 0, 0)
    return compare < hoy
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" />
      <div onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl rounded-b-none sm:rounded-3xl w-full max-w-sm shadow-2xl animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-5 sm:p-6 max-h-[80vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Reservar Cita</h3>
            <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <p className="text-sm font-semibold text-slate-800 mb-1">{producto.nombre}</p>
          <p className="text-xs text-slate-400 mb-4">{monedaSimbolo}{producto.precio.toFixed(2)}</p>

          {/* Calendar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <button onClick={() => setMesOffset(m => m - 1)} disabled={!puedeNavegarAtras} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              </button>
              <span className="text-sm font-bold text-slate-700">{MESES[mesActual.getMonth()]} {mesActual.getFullYear()}</span>
              <button onClick={() => setMesOffset(m => m + 1)} className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center mb-1">
              {DIAS_SEMANA.map(d => <span key={d} className="text-[10px] font-semibold text-slate-400 py-1">{d}</span>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {diasDelMes.map((d, i) => {
                if (!d) return <div key={`e-${i}`} />
                const isPast = isPastDay(d)
                const isSelected = selectedDate && d.getTime() === selectedDate.getTime()
                const isToday = d.getTime() === hoy.getTime()
                return (
                  <button key={d.toISOString()} disabled={isPast} onClick={() => setSelectedDate(d)}
                    className={`py-1.5 text-xs font-semibold rounded-lg transition-all ${isPast ? 'text-slate-300 cursor-not-allowed' : isSelected ? 'bg-[var(--primary)] text-white shadow-sm' : isToday ? 'bg-[var(--primary)]/10 text-[var(--primary)]' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    {d.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {selectedDate && (
            <div className="mb-4 animate-in slide-in-from-bottom-2 fade-in duration-200">
              <p className="text-xs font-semibold text-slate-500 mb-2">Selecciona la hora</p>
              <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                {BLOQUES_HORARIOS.map(h => (
                  <button key={h} onClick={() => setSelectedHour(h)}
                    className={`py-1.5 text-[11px] font-semibold rounded-lg border transition-all ${selectedHour === h ? 'bg-[var(--primary)] text-white border-[var(--primary)]' : 'bg-white text-slate-600 border-slate-200 hover:border-[var(--primary)] hover:text-[var(--primary)]'}`}
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button onClick={handleConfirm} disabled={!selectedDate || !selectedHour}
            className="w-full py-2.5 bg-[var(--primary)] text-white font-bold rounded-xl text-sm hover:brightness-110 disabled:opacity-40 transition-all shadow-sm">
            Confirmar Cita
          </button>
        </div>
      </div>
    </div>
  )
}