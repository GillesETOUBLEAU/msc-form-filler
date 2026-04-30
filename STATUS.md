# MSC Form Filler — État des lieux

> Dernière mise à jour : 30 avril 2026

## Dashboard

**URL** : https://stunning-inspiration-production-6a46.up.railway.app/

---

## Architecture

```
   quiz-msc-escale-a-paris.fr  ─┐    Dashboard (Next.js)  ─┐
   (WMH-Project quiz, Vite)     │    ajout manuel          │
                                ▼                          ▼
                       Supabase (PostgreSQL)
                   msc_newsletter_contacts table
                 pending → processing → done/error
                                │
                                ▼
                  Worker (Node + Playwright headless)
                                │
                                ▼
              info.msccruises.com/stand-pop-up.html
                       (Marketo Forms 2)
```

**Sources d'inscription :**
- **Quiz public** ([WMH-Project/msc-cruise-profile-finder](https://github.com/WMH-Project/msc-cruise-profile-finder)) — POST direct vers `/rest/v1/msc_newsletter_contacts` avec la clé Supabase publishable
- **Dashboard ops** — server action Next.js, ajout à la main / import

### Deux services Railway (même repo GitHub)

| Service | Type | Root Directory | Status |
|---------|------|----------------|--------|
| `msc-form-filler` | Worker (pas de port) | `/` (racine) | Online |
| `stunning-inspiration` | Web (port 3000) | `/dashboard` | Online |

---

## Fonctionnalités

| Fonctionnalité | Status | Détails |
|----------------|--------|---------|
| Remplissage automatique du formulaire MSC | ✅ | Playwright headless pilote `MktoForms2` (form 4669, munchkin `271-DJN-199`) |
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
| Worker | Node.js + Playwright | v1.59.1 |
| Dashboard | Next.js + React | 15.x / 19.x |
| CSS | Tailwind CSS | v4 |
| Base de données | Supabase (PostgreSQL) | — |
| Hébergement | Railway | 2 services |
| Docker (Worker) | `mcr.microsoft.com/playwright:v1.59.1-jammy` | — |
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
| `nom` | TEXT | Nom (obligatoire, max 15 char côté form Marketo) |
| `telephone` | TEXT | Téléphone (obligatoire — sinon Marketo rejette) |
| `profiling_consent` | BOOLEAN | Checkbox "expérience personnalisée" du quiz |
| `quiz_answers` | JSONB | Array des 5 réponses du quiz (ex. `["B","A","D","C","B"]`) |
| `profile_letter` | TEXT | Profil calculé : `'A'` / `'B'` / `'C'` / `'D'` |
| `status` | TEXT | `pending` → `processing` → `done` / `error` |
| `processed_at` | TIMESTAMPTZ | Date de traitement |
| `process_details` | TEXT | "OK" ou message d'erreur (max 500 chars) |

---

## Flux de traitement

1. **Ajout** — Contact inséré dans Supabase (`status = 'pending'`) via :
   - le quiz `quiz-msc-escale-a-paris.fr` (REST avec clé publishable)
   - le dashboard ops (server action Next.js)
   - insertion directe en base
2. **Détection** — Le worker reçoit l'event Realtime INSERT (ou le découvre au polling 60s)
3. **Traitement** — Playwright ouvre `info.msccruises.com/stand-pop-up.html`, pilote le SDK Marketo (`form.vals` + `form.submit`), attend le callback `onSuccess`
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

- **Dépendance Marketo** — Si MSC change `formId` ou `munchkinId`, le worker cassera. Vérifier `MktoForms2.getForm(<id>)` dans la console si besoin.
- **`prenom` / `nom` 15 char max** — Le formulaire Marketo (champs `firstNameWebform` / `lastNameWebform`) tronque silencieusement au-delà.
- **RLS permissive** — La table accepte les inserts anonymes via la clé publishable (utilisée par le quiz public). Lecture/update/delete restent réservés au service_role.
- **Cookie banner** — Le worker tente de fermer OneTrust avant que Marketo monte le formulaire
- **Quiz answers en deux écritures** — Le quiz fait un INSERT au submit du formulaire (lead capture, même en cas d'abandon), puis un PATCH sur la même row à la fin du quiz pour ajouter `quiz_answers` + `profile_letter`. Si l'utilisateur abandonne, ces colonnes restent NULL pour cette row.
