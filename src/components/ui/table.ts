// Shared table cell classes matching the design tokens (table header 10.5px /
// 800 / uppercase; cells 13px). Numeric cells add `tnum text-right`.
export const TH =
  'px-3 py-[11px] text-left text-[10.5px] font-extrabold uppercase tracking-[0.07em] text-ink-muted bg-app-panel border-b border-[#EDE6DB] whitespace-nowrap'
export const TH_R = TH + ' text-right'
export const TD =
  'px-3 py-[11px] text-[13px] text-ink-body border-t border-[#F1EBE2] align-middle'
export const TD_R = TD + ' text-right tnum whitespace-nowrap'
export const TD_B = TD + ' font-bold text-ink'
export const TD_RB = TD_R + ' font-extrabold text-ink'

// Monthly subtotal row (gold-tinted) — used by transaction modules.
export const SUB_L =
  'px-3 py-[11px] text-right text-[11px] font-extrabold uppercase tracking-[0.05em] text-brand-dark bg-gold-tint border-t-2 border-gold-border whitespace-nowrap'
export const SUB_R =
  'px-3 py-[11px] text-right text-[13px] font-extrabold text-brand-dark bg-gold-tint border-t-2 border-gold-border tnum whitespace-nowrap'

// Menu category group header row inside the Menu table.
export const GROUP_TD =
  'px-3 py-[11px] text-[11px] font-extrabold uppercase tracking-[0.06em] text-brand bg-[#F1F6F2] border-y border-[#E1EBE3]'
