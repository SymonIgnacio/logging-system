# AGENTS.md - Development Guidelines for Logging System

## Project Overview

This is a **React + TypeScript** application with **Vite**, **Firebase** (Firestore + Auth), and **Tailwind CSS**. It is a school logging/attendance system with role-based access (admin/student).

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite 7
- **Styling**: Tailwind CSS 4
- **Backend**: Firebase (Firestore, Auth)
- **Excel Processing**: xlsx library
- **Routing**: React Router DOM 7
- **Icons**: React Icons (Fi* from feather-icons)

---

## Commands

### Development

```bash
# Start development server
npm run dev
```

### Build & Lint

```bash
# Build for production
npm run build

# Run ESLint
npm run lint

# Preview production build
npm run preview
```

---

## Code Style Guidelines

### TypeScript

- **Always use explicit types** for function parameters and return types
- Avoid `any` - use `unknown` with proper type guards or create explicit interfaces
- Example:

```typescript
// Good
interface Period {
  id: string;
  teacher: string;
  grade: string;
}

// Avoid
const period: any = { ... };
```

### Imports

- Use absolute imports with relative paths from `src/`
- Order imports: React → external libraries → internal components/services → types
- Example:

```typescript
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { useAuth } from "../context/AuthContext";
import type { AppUser } from "../types";
```

### Naming Conventions

- **Components**: PascalCase (e.g., `ClassLogger.tsx`, `Dashboard.tsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **Interfaces**: PascalCase with descriptive names (e.g., `Period`, `Log`, `AppUser`)
- **Variables/Functions**: camelCase
- **Constants**: SCREAMING_SNAKE_CASE for config values

### React Patterns

- Use functional components with hooks
- Destructure props properly
- Define component interfaces explicitly
- Use `useEffect` cleanup functions for subscriptions

```typescript
// Good
export default function ClassLogger() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(q, (snapshot) => { ... });
    return () => unsubscribe();
  }, [dependencies]);

  return ( ... );
}
```

### Error Handling

- Always wrap async operations in try/catch
- Set error states in React for UI feedback
- Log errors to console with meaningful messages
- Example:

```typescript
try {
  await addDoc(collection(db, "logs"), data);
  setMessage({ type: "success", text: "Logged successfully!" });
} catch (err: unknown) {
  const errorMessage = err instanceof Error ? err.message : "Unknown error";
  setMessage({ type: "error", text: errorMessage });
}
```

### Firestore Patterns

- Use `onSnapshot` for real-time data
- Always clean up subscriptions in `useEffect` return
- Use queries with `where` clauses for filtering
- Example:

```typescript
useEffect(() => {
  const q = query(collection(db, "periods"), where("grade", "==", user.grade));
  const unsubscribe = onSnapshot(q, (snapshot) => { ... });
  return () => unsubscribe();
}, [user.grade]);
```

### CSS / Tailwind

- Use Tailwind utility classes
- Prefer semantic class names for complex layouts
- Example:

```tsx
<div className="p-6 max-w-xl mx-auto">
  <h1 className="text-2xl font-bold mb-4">Title</h1>
  <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
    Action
  </button>
</div>
```

### File Organization

```
src/
├── components/     # Reusable UI components (Sidebar, Header, PrivateRoute)
├── contexts/       # React contexts (AuthContext)
├── layouts/        # Layout components (MainLayout)
├── pages/          # Route pages (Dashboard, ClassLogger, etc.)
├── routes/         # Routing configuration
├── services/       # Firebase/data services
├── App.tsx         # Root component
└── main.tsx       # Entry point
```

### Firebase Config

- Firebase config is in `firebase.ts` at project root
- Firestore collections: `users`, `periods`, `logs`, `sections`, `subjects`, `teachers`
- Auth uses Firebase Auth with email/password

### Common Patterns

**Role-based rendering:**

```typescript
const { user } = useAuth();
if (user?.role === "admin") {
  return <AdminView />;
}
return <StudentView />;
```

**Real-time data with filtering:**

```typescript
const [data, setData] = useState<Type[]>([]);
useEffect(() => {
  const q = query(collection(db, "collection"), where("field", "==", value));
  return onSnapshot(q, (snapshot) => {
    setData(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}, [value]);
```

---

## Firestore Data Model

```
/users/{uid}
  - email: string
  - grade: string
  - section: string
  - role: "admin" | "student"

/periods/{docId}
  - teacher: string
  - grade: string
  - section: string
  - subject: string
  - period: string  // "8:00-9:00"

/logs/{docId}
  - teacher: string
  - grade: string
  - section: string
  - subject: string
  - period: string
  - periodId: string
  - status: "present" | "absent" | "late"
  - startTime: timestamp
  - date: string  // "YYYY-MM-DD"
  - loggedBy: uid

/sections/{id}  // id = "grade-section", e.g., "7-A"
  - grade: string
  - section: string

/subjects/{id}  // id = subjectName
  - subjectName: string

/teachers/{id}  // id = teacherName
  - name: string
  - subjects: string[]
```

---

## Important Notes

1. **No test framework configured** - Tests would need to be set up (consider Vitest or React Testing Library)
2. **Analytics import removed** - Was causing build errors; add back if needed
3. **Role field required** - Users must have `role: "admin"` or `role: "student"` in Firestore
4. **Period format** - Uses "HH:MM-HH:MM" (e.g., "8:00-9:00") for time ranges

---

## ESLint Configuration

The project uses ESLint with:
- TypeScript ESLint
- React hooks plugin
- React refresh plugin

Run `npm run lint` before committing to catch issues.
