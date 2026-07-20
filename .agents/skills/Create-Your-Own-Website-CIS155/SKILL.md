```markdown
# Create-Your-Own-Website-CIS155 Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development patterns and conventions used in the `Create-Your-Own-Website-CIS155` TypeScript codebase. You'll learn about file naming, import/export styles, commit message habits, and how to write and run tests. While no automated workflows were detected, this guide provides structured commands and step-by-step instructions for common development tasks.

## Coding Conventions

### File Naming
- **Style:** camelCase
- **Example:**  
  ```
  myComponent.ts
  userProfile.ts
  ```

### Import Style
- **Relative imports are used.**
- **Example:**
  ```typescript
  import { myFunction } from './utils';
  import { UserProfile } from '../models/userProfile';
  ```

### Export Style
- **Named exports are preferred.**
- **Example:**
  ```typescript
  // In userProfile.ts
  export interface UserProfile { ... }

  export function getUserProfile(id: string): UserProfile { ... }
  ```

### Commit Message Patterns
- **Freeform messages, no strict prefixes.**
- **Average length:** 34 characters
- **Examples:**
  ```
  Add user profile component
  Fix bug in navigation menu
  Update README with setup steps
  ```

## Workflows

### Adding a New Feature
**Trigger:** When you want to implement a new feature.
**Command:** `/add-feature`

1. Create a new TypeScript file using camelCase naming.
2. Use relative imports to bring in dependencies.
3. Export your functions or components using named exports.
4. Write or update corresponding test files (e.g., `myFeature.test.ts`).
5. Commit your changes with a clear, concise message.

### Fixing a Bug
**Trigger:** When you need to resolve a bug in the codebase.
**Command:** `/fix-bug`

1. Locate the relevant TypeScript file(s).
2. Apply the necessary code changes.
3. Update or add test cases to cover the fix.
4. Commit with a descriptive message about the bug fix.

### Writing and Running Tests
**Trigger:** When you need to verify code correctness.
**Command:** `/run-tests`

1. Create or update test files matching the `*.test.*` pattern.
2. Use the project's preferred (unknown) testing framework.
3. Run the test suite using the appropriate command (consult project docs or package.json scripts).

## Testing Patterns

- **Test files follow the pattern:** `*.test.*` (e.g., `userProfile.test.ts`)
- **Testing framework:** Not explicitly detected; check project documentation or dependencies.
- **Example test file:**
  ```typescript
  import { getUserProfile } from './userProfile';

  test('returns user profile for valid ID', () => {
    const profile = getUserProfile('123');
    expect(profile).toBeDefined();
    expect(profile.id).toBe('123');
  });
  ```

## Commands
| Command        | Purpose                                  |
|----------------|------------------------------------------|
| /add-feature   | Start the process for adding a new feature|
| /fix-bug       | Begin fixing a bug in the codebase        |
| /run-tests     | Run all test suites                      |
```
