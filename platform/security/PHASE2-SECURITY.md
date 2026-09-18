# Phase 2 Security Model

- Infrastructure endpoints require authentication.
- Every resource is scoped to the authenticated user.
- Audit events are persisted for create, status-update and delete operations.
- Provider execution is intentionally separated from database CRUD.
- No cloud credentials are embedded in source code.
- No real server creation is performed by this phase.
- External provider credentials should be supplied through protected environment/secret management.
- A future provisioning layer should require an explicit approval gate before destructive or billable actions.
