# Fix Vercel Next.js Detection

## What was done
Added `"next": "latest"` to root `package.json` dependencies.

## Why
Vercel CLI checks the **root** `package.json` for Next.js version detection during deployment. Even though Next.js is already in `apps/web/package.json`, the root must also declare it for Vercel's build system to recognize the framework.

## Key details
- Version pinned as `"latest"` to match the strategy in `apps/web/package.json`
- Existing workspace dependencies (`@taukei/env`, `@taukei/domain`) left unchanged
- JSON validated successfully
