# Firestore Database Visualization

This diagram reflects the current Firestore model used by the app.

## 1) Entity Relationship View

```mermaid
erDiagram
  USERS {
    string uid PK
    string email
    string grade
    string section
    string role
  }

  PERIODS {
    string id PK
    string teacher
    string grade
    string section
    string subject
    string period
  }

  LOGS {
    string id PK
    string periodId FK
    string teacher
    string grade
    string section
    string subject
    string period
    string status
    timestamp startTime
    string date
    string loggedBy FK
  }

  SECTIONS {
    string id PK
    string grade
    string section
  }

  SUBJECTS {
    string id PK
    string subjectName
  }

  TEACHERS {
    string id PK
    string name
    string[] subjects
  }

  USERS ||--o{ LOGS : "loggedBy -> uid"
  PERIODS ||--o{ LOGS : "periodId -> id"
  SECTIONS ||--o{ USERS : "grade+section"
  SECTIONS ||--o{ PERIODS : "grade+section"
  TEACHERS ||--o{ PERIODS : "teacher (name)"
  SUBJECTS ||--o{ PERIODS : "subject (subjectName)"
  SUBJECTS ||--o{ TEACHERS : "subjects[] contains subjectName"
```

## 2) Data Flow / Feature-to-Collection View

```mermaid
flowchart LR
  ImportData[Import Data Page] --> Sections[(sections)]
  ImportData --> Subjects[(subjects)]
  ImportData --> Teachers[(teachers)]
  ImportData --> Users[(users)]
  ImportData --> Periods[(periods)]

  Auth[AuthContext / Login] --> Users

  ClassLogger[Class Logger] --> Periods
  ClassLogger --> Logs[(logs)]
  ClassLogger --> Users

  Dashboard[Dashboard] --> Periods
  Dashboard --> Logs

  Tracker[Class Tracker] --> Periods
  Tracker --> Logs

  Reports[Reports] --> Periods
  Reports --> Logs
```

## 3) Relation Notes

- Firestore does not enforce foreign keys; these are application-level (soft) relations.
- `logs.periodId` references `periods/{id}`.
- `logs.loggedBy` references `users/{uid}`.
- `periods.teacher` and `periods.subject` are stored as strings (matching teacher name and subject name).
- `sections/{id}` uses `grade-section` format (example: `7-A`).
- `teachers/{id}` and `subjects/{id}` use name-based IDs.
