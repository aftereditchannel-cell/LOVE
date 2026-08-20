# 🛡️ Security — Couple OS

## Token Architecture

### Three Separate Token Types

1. **GitHub Server Token** (`GITHUB_TOKEN`)
   - Purpose: GitHub API, Gist backup, repository operations
   - Storage: Backend environment variable ONLY
   - Never sent to Android client
   - Never stored in APK, database, or logs

2. **Personal Couple Token** (`COUPLE_USER_TOKEN_A`)
   - Purpose: Authenticate Person A
   - Storage: Android Keystore (encrypted)
   - Scope-based permissions

3. **Partner Couple Token** (`COUPLE_USER_TOKEN_B`)
   - Purpose: Authenticate Person B
   - Storage: Android Keystore (encrypted)
   - Scope-based permissions

## Token Permissions (Scope-Based)

```
USER_A_TOKEN:
  profile:self:read
  profile:self:write
  mood:self:read
  mood:self:write
  journal:self:read
  journal:self:write
  private:self:read
  private:self:write
  shared:read
  shared:write
  partner:read-limited
```

## Couple Isolation

**Most Important Backend Security Rule:**

Every request is validated against:
1. Authenticated Identity
2. Token Scope
3. Couple Membership
4. Resource Ownership

User A can NEVER access User B's private data or another couple's data.

## Storage Security

### Never Store Secrets In:
- HTML / CSS / JavaScript
- React Bundle
- APK
- Git / GitHub Repository
- LocalStorage
- SharedPreferences (plaintext)
- IndexedDB
- Logs
- Analytics

### Android: Android Keystore
### Backend: Environment Variables / Secret Manager

## Token Display

Tokens are always masked:
```
••••••••••ABCD
```

## GitHub Token Setup

1. Create a GitHub Personal Access Token
2. Grant minimum required permissions (gist scope only)
3. Set as `GITHUB_TOKEN` environment variable on server
4. Never commit the token
5. Never include in APK
6. If leaked, immediately revoke and create new token

## Reporting Security Issues

If you discover a security vulnerability, please report it responsibly.
Do NOT create a public GitHub issue for security vulnerabilities.
