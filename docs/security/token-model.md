# Token Model — Couple OS

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ GitHub Token    │     │ Personal Token  │     │ Partner Token   │
│ (Server Only)   │     │ (User A)        │     │ (User B)        │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ Storage:        │     │ Storage:        │     │ Storage:        │
│ Env Variable    │     │ Android         │     │ Android         │
│                 │     │ Keystore        │     │ Keystore        │
├─────────────────┤     ├─────────────────┤     ├─────────────────┤
│ Purpose:        │     │ Purpose:        │     │ Purpose:        │
│ Gist Backup     │     │ Auth User A     │     │ Auth User B     │
│ GitHub API      │     │ Access Control  │     │ Access Control  │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Token Flow

### First Launch
1. User selects identity (Person A or B)
2. Enters personal token
3. Enters partner token
4. Backend validates both tokens
5. Backend creates session JWT
6. Session stored in Android Keystore
7. Tokens never displayed again

### Subsequent Launches
1. App checks Keystore for session
2. Session JWT sent with every API request
3. No token re-entry needed

### Token Scopes
```
profile:self:read      — Read own profile
profile:self:write     — Update own profile
mood:self:read         — Read own moods
mood:self:write        — Create/update own moods
journal:self:read      — Read own journal
journal:self:write     — Create/update own journal
private:self:read      — Read own private content
private:self:write     — Create/update own private content
shared:read            — Read shared content
shared:write           — Create/update shared content
partner:read-limited   — Read partner's name, mood (limited)
```

## Security Rules

- Tokens NEVER in: APK, Git, logs, analytics, crash reports
- Tokens displayed as: `••••••••••ABCD`
- Session rotation on suspicious activity
- Device revocation capability
- Audit log for all auth events
