# Handoff: Catering Berkah 1121 — Purchasing & Finance App

## Overview
A responsive web app (mobile + desktop) for a catering business ("Catering Berkah 1121") to manage purchasing and finance. It has a login screen, an animated brand splash, and a left-sidebar layout with 11 modules: Dashboard, Master Data, Pembelian Bahan Baku, Penjualan, Gaji Karyawan, Biaya Operasional, Hutang, Petty Cash, Aset & Depresiasi, P&L (Laba Rugi), and Manajemen Pengguna. Role-based access (Super Admin / Admin / custom roles), full add/edit/delete on transactions, and automatic roll-up of every module into the P&L report.

## About the Design Files
The files in this bundle are **design references created in HTML** — a working prototype that shows the intended look, layout, and behavior. They are **not production code to ship directly**. The task is to **recreate these designs in the target codebase's environment** (e.g. React, Vue, etc.) using its established components, state management, routing, and styling patterns. If no codebase exists yet, pick an appropriate stack (React + a state layer + a component library, or similar) and implement there. Wire the UI to a real backend/database and real authentication — the prototype keeps all data in memory and simulates login.

The prototype is authored as a single "Design Component" (`Catering Berkah.dc.html`) that runs on a small in-house runtime (`support.js`). Treat the runtime as scaffolding; port the **markup, styling, data model, and logic**, not the runtime itself.

## Fidelity
**High-fidelity (hifi).** Final colors, typography, spacing, and interactions are all specified. Recreate the UI pixel-accurately using the codebase's libraries. Exact palette, type, and behavior are documented below.

## Tech in the prototype (for reference only)
- Single component class (`Component extends DCLogic`) with React-like `state` / `setState` / `renderVals()` — port this to your framework's component + state model.
- All styling is inline (no CSS framework). A few `@keyframes` live in a `<style>` block (splash animations, fade).
- Font: **Plus Jakarta Sans** (Google Fonts), weights 400/500/600/700/800.
- All monetary values formatted as `Rp ` + thousands-separated (id-ID locale).

## Design Tokens

### Colors
- Brand green (primary): `#16603F`; darker `#14432E`; deep sidebar `#10362A`; splash gradient `#1B5138`→`#10362A`→`#0C2A20`
- Gold accent: `#C9A93B`; light gold `#E2C77E` / `#F1E4C0`; gold tint bg `#FAF4E4`, border `#EADFBE`, text `#9A7018`
- App background: `#F7F4EF`; card white `#FFFFFF`; card border `#EAE3D8`; subtle panel `#FBF9F5`
- Text: primary `#241C15`; secondary `#6B5E4C` / `#4A4033`; muted `#8A7B68` / `#A79A87`
- Sidebar text: active `#F1E4C0` on `rgba(201,169,59,0.16)`; inactive `#9FB3A6`
- **Input convention (important):** manual input = **blue** (`#2A62C9`, field bg `#F8FAFF`, border `#C9D9F4`); pulled-from-Master-Data = **green** (`#1F7A4D`, bg `#F4FBF7`, border `#BEE3CE`); auto-calculated = **neutral/black** read-only (bg `#F2EFEA`, border `#E4DDD2`)
- Status badges: Lunas/Dibayar/Settle green (`#1F7A4D` on `#E7F5EE`/`#BEE3CE`); DP/Belum Lunas amber (`#B45309`/`#9A7018` on `#FBF3DC`/`#EAD9A6`); Belum Bayar/Jatuh Tempo/Not Settle red (`#B3261E` on `#FDE9E5`/`#F5C6BD`)
- Margin health (HPP): ≥50% green, 35–50% amber, <35% red (same badge palette)

### Typography
- Family: Plus Jakarta Sans
- Page title (h1): 22px / 800 / -0.01em
- Section/card title: 13–15.5px / 800
- Table header: 10.5px / 800 / uppercase / 0.07em, color `#8A7B68`, bg `#FBF9F5`
- Table cell: 13px / `#4A4033`; numeric cells `font-variant-numeric: tabular-nums`, right-aligned
- Body/label: 12–14px

### Spacing / shape
- Card radius 16px; modal radius 18px; button/field radius 10–12px; pill/badge radius 99px
- Main content max-width 1240px, padding `clamp(14px,2.5vw,28px)`
- Sidebar width 236px (desktop, fixed); mobile drawer 264px slide-in with scrim
- Field height 44px; button height 44px
- Card shadow subtle; modal shadow `0 24px 80px rgba(30,20,10,0.3)`

## Screens / Views

### 0. Splash (pre-login loading)
Full-screen radial green gradient. Centered: app icon (168px, `assets/app-icon-white.png`) with pulsing gold ring behind it (`cbRing` 2s infinite), title "Catering Berkah **1121**" (1121 in gold), italic tagline "for your every moment", and a gold progress bar (`cbBarFill` 2.4s). Auto-dismisses after ~2.2s with a fade-out (`cbFadeOut`) into the login screen.

### 1. Login
Full-bleed background image (`assets/login-bg.png`, left-center cover). Centered frosted card (`rgba(9,30,20,0.55)` + `blur(14px)`, gold border): title "Login", **ID Pengguna** and **Password** fields (password has an eye toggle for show/hide), error message on bad credentials, gold "Masuk" button. Prototype accounts: Super Admin `dony`/`cateringberkah1121`; Admin `hamada` & `fahmi`/`berkah2026`. Replace with real auth.

### 2. Layout shell
Fixed deep-green sidebar: brand header (app icon + "Catering Berkah 1121" / "PLATFORM OPERASI" + search box with ⌘K chip), nav list of the 11 modules (each with a 2-letter code badge; active = gold), and a footer block: user avatar+name+role, a full-width **Layar penuh** button (native Fullscreen API, label/icon toggles when active), then **Panduan** + **Keluar** side by side. Nav is filtered by the logged-in user's permissions. Mobile: sidebar becomes a hamburger drawer; a sticky top bar appears. Content area is scroll-locked when any modal/overlay is open.

### 3. Dashboard
KPI cards: Total Pendapatan, Total Pembelian, Total Beban Gaji, Laba Bersih, Margin Kotor %, Margin Bersih %. A monthly line chart (SVG) — Pendapatan (gold) vs Pembelian (sage) vs Laba Bersih (green). Two donut charts (CSS conic-gradient): purchase composition by ingredient category, sales composition by menu category, each with a legend.

### 4. Master Data (tabs)
Tabs: **Kategori & Referensi** (chips for ingredient categories, menu categories, payment methods, payment statuses — categories can be added), **Supplier** (table Nama/Kategori/Kontak, add + delete), **Karyawan** (Nama/Jabatan/Departemen/Tipe Gaji [Harian/Bulanan]/Gaji Pokok/Upah per Hari — add/edit/delete), **Menu & Harga Jual** — one separate table per menu category with columns Menu (+ composition text), **HPP/Porsi**, **Harga Jual/Porsi**, **Margin** (health badge), Aksi. Edit/Add menu opens a modal with a **HPP recipe editor**: ingredient rows (nama, qty, satuan dropdown [pcs/kg/gr/liter/ml/btr/ikat/porsi/bungkus/sdm/sdt], harga, auto subtotal), a scrollable list, "+ Bahan" button, and live Total HPP / Laba per Porsi / Margin % with a verdict (harga sehat / margin tipis / rugi). Opening edit pre-seeds ingredient rows from the menu's composition text.

### 5. Pembelian Bahan Baku
Transactions grouped per month with a monthly SUBTOTAL row. Columns: Tanggal, Bahan (+category), Supplier, Qty, Harga Satuan, Total (=Qty×Harga, auto), Status badge, Foto (multi-photo proof thumbnails, click to enlarge in lightbox), PIC, Aksi (Edit/Hapus). Add/Edit modal follows the blue/green/neutral input convention; PIC is a dropdown from Master Data employees; deleted employees render blank in the PIC column.

### 6. Penjualan
Grouped per month + subtotal. Columns: Tanggal, Customer/Event, Menu (+category), Porsi, Harga/Porsi (green — from Master Data, overridable), Total (auto), **Sisa Pembayaran** (shown for DP/Belum Bayar), Status, PIC, Aksi. Add/Edit modal computes Total and Sisa live.

### 7. Gaji Karyawan
Grouped per month + subtotal (Total Beban Gaji & Take Home Pay). Columns: Karyawan (+period note), Tipe Gaji, Upah/Hari, Hari Kerja, Gaji Dasar, Tunjangan, Bonus/Lembur, Potongan, Total Beban Gaji, Take Home Pay, Status, Aksi (Edit/Hapus — **only visible to Super Admin & Admin**). Harian employees: Hari Kerja is set via a **calendar picker** in the edit modal (tick the dates worked; Sundays marked red; total days drives Gaji Dasar). Bulanan employees: fixed salary, no calendar. Prototype seeded with real Jul–Dec 2026 payroll (7 employees, weekly for kitchen staff + monthly for office).

### 8. Biaya Operasional
Grouped per month + subtotal. Columns: Tanggal, Keterangan, Kategori (Sewa/Listrik-Air-Gas/Transport/Marketing/Lain-lain), Jumlah, Metode, Foto Nota, Catatan, Aksi (Edit/Hapus).

### 9. Hutang
Summary cards (Total Hutang, Sudah Dibayar, Total Sisa). Table: Tgl Hutang, Kreditur (+jenis), Keterangan, Jumlah, Jatuh Tempo, Sudah Dibayar, Sisa (auto), Status (auto: Lunas/Belum Lunas/Jatuh Tempo), Aksi (Edit/Hapus).

### 10. Petty Cash
Grouped per month with Saldo Awal, columns Tanggal/Keterangan/Foto Bukti/Masuk/Keluar/Saldo (running, auto), subtotal, Saldo Akhir with a Settle (green) / Not Settle Yet (red) badge.

### 11. Aset & Depresiasi
Summary cards (Total Perolehan, Akumulasi Depresiasi, Nilai Buku, Beban Depresiasi/Bulan). Table: Tgl Perolehan, Nama Aset (+kategori), Harga Perolehan, Umur Ekonomis, Nilai Residu, Depresiasi/Bulan (straight-line, auto), Akum. Depresiasi, Nilai Buku, Status. Monthly depreciation auto-flows into P&L from the acquisition month.

### 12. P&L (Laba Rugi)
Read-only 12-month + annual-total table auto-computed from all modules: Pendapatan, HPP/Pembelian, Laba Kotor, Margin Kotor %, Beban Operasional (Gaji, Sewa, Listrik, Transport, Marketing, Lain-lain, **Depresiasi Aset**), Total Beban Operasional, Laba Bersih, Margin Bersih %. Sticky first column.

### 13. Manajemen Pengguna (Super Admin only)
Add/edit/delete user accounts (Nama, ID, Password, Role, per-module permission checkboxes). Role can be picked from the list or typed as a new custom role. A **Daftar Peran** card lists all roles as chips: Super Admin & Admin are locked (core, no delete); custom roles show a ×; a role currently assigned to a user cannot be deleted.

## Interactions & Behavior
- Add/Edit forms are modals (bottom-sheet on mobile, centered on desktop) with the blue/green/neutral input-color convention and a legend.
- Auto-calculated fields (Total, Sisa, HPP, Margin, Gaji Dasar, Take Home Pay, running balances, P&L) recompute live and are never directly editable.
- Photo proof fields accept multiple images with removable thumbnails; clicking a thumbnail opens a lightbox.
- Monthly tables always carry a subtotal row; deleting/editing rows updates subtotals, Dashboard, and P&L immediately.
- Fullscreen button uses the browser Fullscreen API (label + icon toggle; syncs with `fullscreenchange`/Esc).
- Body scroll is locked whenever a modal, panduan, lightbox, splash, or login overlay is open.
- Splash → fade → login → app.

## State Management
Port these in-memory stores to real persistence: users+roles, suppliers, employees, menu categories/items (with HPP recipes), and per-module transaction lists (buy, sell, gaji, opex, hutang, petty, assets). Derived/computed: row totals, monthly subtotals, HPP/margin, depreciation schedule, and the entire P&L. Auth state (current user + permissions) gates nav and the Gaji edit/Manajemen Pengguna access.

## Assets
In `assets/` (copy into the handoff): `app-icon-white.png` (cloche logo, used in splash + sidebar), `login-bg.png` (login background), plus the earlier `logo*.png`/`app-icon.png` variants. Fonts via Google Fonts (Plus Jakarta Sans). No icon library — icons are inline SVG.

## Files
- `Catering Berkah.dc.html` — the complete prototype (all screens, styling, logic).
- `support.js` — the prototype runtime (reference only; do not port).
- `assets/` — images used by the design.
