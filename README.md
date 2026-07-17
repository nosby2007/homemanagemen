# Home Inspection App (Angular 16 + Firebase)

This zip includes an **MVP** focused on:
- **Findings** (create + list)
- **Photos** (upload to Firebase Storage and persist metadata in Firestore)
- **Convert Finding → Work Order** (one click, idempotent)
- **Work Order Details** (assign, due date, status/priority, time logs, materials)
- **Reports** (Generate PDF via Cloud Functions + store in Storage)

## Data model

Firestore (multi-tenant):
- `users/{uid}`
  - `lastOrgId: string`
- `orgs/{orgId}/members/{uid}`
  - `role: 'admin' | 'manager' | 'inspector'`
- `orgs/{orgId}/inspections/{inspectionId}`
- `orgs/{orgId}/findings/{findingId}`
- `orgs/{orgId}/workOrders/{workOrderId}`
- `orgs/{orgId}/reports/{reportId}`

Storage:
- `orgs/{orgId}/inspections/{inspectionId}/findings/{findingId}/{fileName}`
- `orgs/{orgId}/reports/{reportId}/report.pdf`

## Quick start

1. Install deps
```
npm install
```

2. Configure Firebase
- Update `src/environments/environment.ts` with your Firebase config.
- If you use emulators, keep `useEmulators: true`.

3. Start emulators (recommended)
```
firebase emulators:start
```

4. Run Angular
```
npm start
```

## Required initial docs
After you create an account in the Login screen:
1) Create user profile:
- `users/{uid}` with `lastOrgId: 'ORG_DEMO'`

2) Create membership:
- `orgs/ORG_DEMO/members/{uid}` with `role: 'admin'`

Then refresh the app.

## Smoke test
- Go to **Inspections** → **New Inspection** → open it
- Add a Finding (summary + room + severity)
- Upload a photo in the Finding
- Click **Convert to Work Order**
- Go to **Work Orders** to confirm
- Open a work order and add **Time Logs** and **Materials**
- Go to **Reports** and click **Generate PDF Report**, then download when status is **ready**

## Next steps
- Inspection checklist sections/items
- PDF report enhancements (embed photos, signatures, sections, branding)
- Admin dashboard charts (trend lines, SLA, completion rate)
- Role-based permissions (fine-grained)
# homemanagemen
