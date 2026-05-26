export function BokehBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
      <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-violet-400/20 blur-[80px] animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-fuchsia-400/15 blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-400/10 blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
    </div>
  )
}

export function ModalBokeh() {
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden>
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-violet-500/10 blur-[120px] translate-x-1/3 -translate-y-1/3" />
      <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-fuchsia-500/10 blur-[100px] -translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-indigo-500/8 blur-[150px]" />
    </div>
  )
}
