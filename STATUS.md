# MSC Form Filler — État des lieux

> Dernière mise à jour : 23 mars 2026

## Dashboard

**URL** : https://stunning-inspiration-production-6a46.up.railway.app/

---

## Architecture

```
                        Supabase (PostgreSQL)
                   msc_newsletter_contacts table
                 pending → processing → done/error
                        ▲               ▲
                        │               │
              ┌─────────┘               └─────────┐
              │                                   │
    ┌─────────────────┐             ┌─────────────────────┐
    │  Worker (Node)  │             │  Dashboard (Next.js) │
    │  Playwright     │             │  Port 3000           │
    │  Headless       │             │  SSR + Server Actions│
    └─────────────────┘             └─────────────────────┘
              │
              ▼
    msccroisieres.fr/formulaires/inscription-newsletter
```

### Deux services Railway (même repo GitHub)

| Service | Type | Root Directory | Status |
|---------|------|----------------|--------|
| `msc-form-filler` | Worker (pas de port) | `/` (racine) | Online |
| `stunning-inspiration` | Web (port 3000) | `/dashboard` | Online |

---

## Fonctionnalités

| Fonctionnalité | Status | Détails |
|----------------|--------|---------|
| Remplissage automatique du formulaire MSC | ✅ | Via Playwright headless + `page.evaluate()` |
| Déclenchement temps réel (Realtime) | ✅ | Supabase Realtime sur INSERT → traitement immédiat |
| Polling de secours | ✅ | Toutes les 60s, vérifie les `pending` manqués |
| Rate limit (concurrence) | ✅ | Semaphore `MAX_CONCURRENCY=10` |
| Anti-détection | ✅ | User-Agent, locale fr-FR, timezone Europe/Paris, throttle 5-10s |
| Drain au démarrage | ✅ | Traite les `pending` et `processing` restants (crash recovery) |
| Dashboard de suivi | ✅ | Stats, activité récente, liste d'erreurs, ajout manuel |
| Ajout de contacts via dashboard | ✅ | Formulaire avec validation côté serveur |
| Webhook externe | ❌ | Pas encore implémenté |

---

## Stack technique

| Composant | Technologie | Version |
|-----------|------------|---------|
| Worker | Node.js + Playwright | v1.58.2 |
| Dashboard | Next.js + React | 15.x / 19.x |
| CSS | Tailwind CSS | v4 |
| Base de données | Supabase (PostgreSQL) | — |
| Hébergement | Railway | 2 services |
| Docker (Worker) | `mcr.microsoft.com/playwright:v1.58.2-jammy` | — |
| Docker (Dashboard) | `node:20-alpine` (multi-stage) | — |

---

## Variables d'environnement

### Worker

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | URL du projet Supabase |
| `SUPABASE_SERVICE_KEY` | Clé **service_role** (accès complet) |
| `SUPABASE_TABLE` | Nom de la table (défaut : `msc_newsletter_contacts`) |
| `MAX_CONCURRENCY` | Nombre de tabs simultanés (défaut : `10`) |

### Dashboard

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé **anon** (publique) |

---

## Base de données

### Table `msc_newsletter_contacts`

| Colonne | Type | Description |
|---------|------|-------------|
| `id` | UUID | Clé primaire (auto-générée) |
| `created_at` | TIMESTAMPTZ | Date de création |
| `email` | TEXT | Email (obligatoire) |
| `prenom` | TEXT | Prénom (obligatoire) |
| `nom` | TEXT | Nom (obligatoire) |
| `telephone` | TEXT | Téléphone (optionnel) |
| `date_naissance` | TEXT | Date de naissance JJ/MM/AAAA (optionnel) |
| `experience_navigation` | TEXT | Expérience croisière : '1','2','3','4' (optionnel) |
| `destination` | TEXT | Destination souhaitée (optionnel) |
| `status` | TEXT | `pending` → `processing` → `done` / `error` |
| `processed_at` | TIMESTAMPTZ | Date de traitement |
| `process_details` | TEXT | "OK" ou message d'erreur (max 500 chars) |

---

## Flux de traitement

1. **Ajout** — Contact ajouté via le dashboard (ou directement en base) avec `status = 'pending'`
2. **Détection** — Le worker reçoit l'event Realtime INSERT (ou le découvre au polling)
3. **Traitement** — Playwright ouvre la page MSC, remplit le formulaire, soumet
4. **Résultat** — Status mis à jour : `done` (succès) ou `error` (avec détail)

---

## Commandes CLI du worker

```bash
npm start          # Mode normal : drain + realtime + polling
npm run drain      # Traite la queue puis quitte
npm run dry-run    # Affiche ce qui serait traité (sans exécuter)
npm run headed     # Mode avec navigateur visible (debug)
```

---

## Points d'attention

- **Fragilité des sélecteurs** — Si MSC modifie son formulaire (IDs, structure), le worker cassera
- **Pas de webhook** — L'ingestion se fait uniquement via le dashboard ou insertion directe en base
- **Pas de RLS** — La table est accessible avec la clé service_role (pas de Row Level Security)
- **Cookie banner** — Le worker tente de le fermer, sinon utilise `evaluate()` pour bypasser
