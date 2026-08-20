# Contributing to Couple OS

## Commit Messages

Use conventional commits:

```
feat(android): add secure couple pairing
feat(backend): add couple authorization middleware
feat(memories): add memory vault with privacy controls
feat(chat): add realtime messaging
fix(auth): prevent unauthorized couple access
fix(sync): resolve offline conflict handling
test(security): add token authorization tests
build(android): generate release APK
docs(api): update endpoint documentation
```

## Branch Strategy

- `main` — Production-ready code
- `develop` — Development branch
- `feat/*` — Feature branches
- `fix/*` — Bug fix branches

## Security

- Run secret scan before every commit
- Never commit tokens, keys, or passwords
- Never hardcode URLs or secrets
- Use environment variables for all configuration

## Code Style

### Kotlin (Android)
- Follow official Kotlin coding conventions
- Use Jetpack Compose best practices
- Inject dependencies via Hilt

### TypeScript (Backend)
- Strict mode enabled
- Use async/await
- Validate all inputs with Zod
- Handle all errors

## Testing

- Unit tests for all repositories
- API tests for all endpoints
- Authorization tests for couple isolation
- Offline behavior tests
