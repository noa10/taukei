# Fix Vercel Deployment - Next.js Version Detection

## TL;DR

> **Quick Summary**: Vercel fails to detect Next.js because it's only in the workspace package.json (`apps/web/package.json`), not the root package.json. Adding Next.js to root dependencies fixes the detection.
> 
> **Deliverables**: 
> - Updated root `package.json` with Next.js in dependencies
> - Verified local build works
> 
> **Estimated Effort**: Quick (5-10 minutes)
> **Parallel Execution**: NO - single sequential task
> **Critical Path**: Edit root package.json → Verify build

---

## Context

### Original Request
Fix Vercel deployment failure: "Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies"."

### Root Cause
Vercel CLI scans the **root** `package.json` for Next.js version detection. The monorepo has Next.js only in `apps/web/package.json` (workspace dependency), which Vercel doesn't check.

---

## Work Objectives

### Core Objective
Add Next.js to root package.json dependencies so Vercel can detect the framework version.

### Concrete Deliverables
- Root `package.json` updated with `"next": "latest"` in dependencies

### Definition of Done
- [x] Root package.json has next in dependencies
- [x] `bun run build` works locally from root
- [x] Vercel deployment would pass version detection

### Must Have
- Next.js in root dependencies matching workspace version strategy

### Must NOT Have (Guardrails)
- Don't duplicate other workspace deps in root
- Don't change version pinning strategy

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (bun test configured)
- **Automated tests**: None needed for this config change
- **Framework**: N/A

### QA Policy
Single verification: Run `bun run build` from project root and confirm no version detection error.

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Single Task):
└── Task 1: Add Next.js to root package.json dependencies [quick]
```

### Dependency Matrix
- Task 1: - (no dependencies)

### Agent Dispatch Summary
- **1**: **1** - T1 → `quick`

---

## TODOs

- [x] 1. Add Next.js to root package.json dependencies

  **What to do**:
  - Edit root `/Users/khairulanwar/dev/taukei/package.json`
  - Add `"next": "latest"` to dependencies object (matching apps/web version strategy)

  **Must NOT do**:
  - Don't add react, react-dom, or other workspace deps to root
  - Don't change existing workspace configuration

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file edit, trivial change
  - **Skills**: `[]`
  - **Skills Evaluated but Omitted**: None needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (only task)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `package.json:33-36` - Current dependencies section to modify
  - `apps/web/package.json:17` - Next.js version reference ("latest")

  **Acceptance Criteria**:
  - [ ] Root package.json dependencies includes "next": "latest"
  - [ ] `bun run build` executes without "No Next.js version detected" error

  **QA Scenarios**:

  ```
  Scenario: Verify build works after fix
    Tool: Bash
    Preconditions: Root package.json updated
    Steps:
      1. Run: bun run build
      2. Verify: Build completes without "No Next.js version detected" error
      3. Verify: Build output shows Next.js compilation
    Expected Result: Build succeeds, Next.js version detected
    Evidence: .sisyphus/evidence/task-1-build-success.txt
  ```

  **Evidence to Capture:**
  - [ ] task-1-build-success.txt - Build output showing success

  **Commit**: YES
  - Message: `fix: add next.js to root package.json for vercel detection`
  - Files: `package.json`
  - Pre-commit: `bun run build`

---

## Final Verification Wave

- [x] F1. **Plan Compliance Audit** — `oracle` → **APPROVE**
  Verify root package.json has next in dependencies. Verify build command works.

- [x] F2. **Code Quality Review** — `unspecified-high` → **APPROVE**
  Check package.json syntax valid. No lint issues.

- [x] F3. **Real Manual QA** — `unspecified-high` → **APPROVE**
  Execute `bun run build` from root, confirm no version detection error.

- [x] F4. **Scope Fidelity Check** — `deep` → **APPROVE**
  Confirm only root package.json changed. No unintended modifications.

---

## Commit Strategy

- **1**: `fix: add next.js to root package.json for vercel detection` - package.json, bun run build

---

## Success Criteria

### Verification Commands
```bash
bun run build  # Expected: Build completes, no "No Next.js version detected" error
```

### Final Checklist
- [x] Next.js in root package.json dependencies
- [x] Build passes locally
- [x] Vercel would detect Next.js version