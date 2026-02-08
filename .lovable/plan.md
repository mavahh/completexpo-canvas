

# Completexpo App - Afmaken Plan

## Huidige Status

De app heeft al een stevige basis met werkende modules:
- **Landing page** met demo-aanvraag formulier
- **Auth** (login, registratie, invite flow)
- **Evenementenbeheer** (CRUD, detail, settings)
- **Plattegrond Builder** (draw mode, undo/redo, autosave, presets, export)
- **Exposantenbeheer** (CRUD, services, portal, invite)
- **Dashboard** met KPI's en grafieken
- **POS/Kassa** (producten, shifts, verkoop, rapporten)
- **Team/Rollen/Rechten** systeem
- **Multi-tenant** (accounts, super admin)
- **Publieke views** (plattegrond, stand-aanvraag)

## Wat er nog ontbreekt of onaf is

### 1. Placeholder pagina's (nog niet gebouwd)
- **Instellingen** (`/settings`) - is een PlaceholderPage
- **CRM** (`/crm`) - is een PlaceholderPage, staat als "Coming Soon"

### 2. Event Settings - onafgemaakte tabs
- **E-mail templates tab** - toont "komt binnenkort beschikbaar"
- **Online betalen tab** - toont "komt binnenkort beschikbaar"

### 3. EventDetail - disabled tiles
- **Handboek** - disabled
- **Bestellingen** - disabled
- **Berichten** - disabled
- **Partners** - disabled
- **Credits** - disabled

### 4. UI/UX verbeteringen nodig
- Landing page heeft placeholder screenshots (geen echte afbeeldingen)
- Floorplan editor toolbar kan beter op mobile/tablet (recent verbeterd maar nog niet perfect)
- Geen onboarding flow voor nieuwe gebruikers
- Geen notificaties systeem

### 5. Ontbrekende functionaliteit
- Geen e-mail verzending (outbox bestaat maar geen echte verzending)
- Geen betalingsintegratie
- Dashboard trend-data is hardcoded (12.5%, 4.2% etc.)

---

## Aanbevolen Aanpak (Prioriteit)

### Fase 1: Placeholder pagina's afmaken (hoogste impact)

**A. Algemene Instellingen pagina (`/settings`)**
- Account-niveau instellingen (bedrijfsnaam, logo, contactgegevens)
- Notificatie-voorkeuren
- Taalinstelling

**B. Event Settings e-mail tab invullen**
- Template editor voor bevestigingsmails, uitnodigingen, herinneringen
- Variabelen systeem (event naam, stand nummer, exposant naam)
- Preview functionaliteit

### Fase 2: Communicatie & Berichten

**C. Berichten module**
- Inbox/outbox per event
- Bulk e-mail naar exposanten (geselecteerd of per status)
- Templates hergebruiken vanuit Event Settings

### Fase 3: Bestellingen & Facturatie

**D. Bestellingen overzicht**
- Overzicht van wat exposanten besteld hebben (stroom, water, licht, tapijt)
- Filter per status, per type
- Export naar CSV

**E. Credits/Facturatie basis**
- Factuurregel generatie op basis van stand + services
- PDF factuur export
- Status tracking (concept, verzonden, betaald)

### Fase 4: Polish & Production-ready

**F. Landing page screenshots**
- Echte screenshots van de app maken en plaatsen
- Of: auto-generated mockups

**G. Dashboard verbeteringen**
- Echte trend-berekeningen op basis van historische data
- Vergelijking met vorige periode

**H. Onboarding wizard**
- Eerste keer inloggen: stap-voor-stap guide
- Account aanmaken, eerste event, eerste hal, eerste stands

---

## Technische Details

### Fase 1A - Instellingen pagina
- Nieuw bestand: `src/pages/Settings.tsx`
- Vervangt de PlaceholderPage in `App.tsx`
- Leest/schrijft naar `accounts` tabel (bestaand)
- Tabs: Algemeen, Notificaties, Taal

### Fase 1B - E-mail templates
- Nieuwe tabel: `email_templates` (event_id, type, subject, body_html, variables)
- Edge function voor preview rendering
- UI in bestaande EventSettings.tsx `email` tab

### Fase 2C - Berichten module
- Nieuwe tabel: `messages` (event_id, sender_id, recipients, subject, body, status, sent_at)
- Nieuwe pagina: `src/pages/Messages.tsx`
- Route toevoegen: `/events/:id/messages`
- EventDetail tile activeren

### Fase 3D - Bestellingen
- Nieuwe pagina: `src/pages/Orders.tsx`
- Aggregeert data uit `exhibitor_services` + `stands`
- Route: `/events/:id/orders`

### Fase 3E - Facturatie
- Nieuwe tabel: `invoices` (event_id, exhibitor_id, lines, total, status)
- Nieuwe tabel: `invoice_lines` (invoice_id, description, qty, unit_price, total)
- PDF generatie met jsPDF (al geinstalleerd)
- Pagina: `src/pages/Invoices.tsx`

### Database migraties nodig
- `email_templates` tabel + RLS
- `messages` tabel + RLS
- `invoices` + `invoice_lines` tabellen + RLS

### Geen nieuwe dependencies nodig
- jsPDF is al geinstalleerd voor PDF generatie
- html2canvas is beschikbaar voor screenshots
- Alle UI componenten zijn al aanwezig

---

## Wat ik aanbeveel om NU te doen

Gezien de omvang raad ik aan om **per fase te werken**. Begin met **Fase 1** (Instellingen pagina + E-mail templates), dan heb je de meest zichtbare placeholders weggewerkt en een solide basis voor communicatie.

Wil je dat ik met een specifieke fase begin, of alle fases in een keer aanpakken?

