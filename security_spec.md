# Security Specification — AulaPro Academic Platform

## 1. Data Invariants
1. **User Profile PII Isolation**: A user's `email` and `users/{userId}` document are strictly readable and writable only by the authenticated owner (`request.auth.uid == userId`) or the bootstrapped admin.
2. **Class Ownership**: A `UniversityClass` cannot be created with a `lecturerId` other than `request.auth.uid`. `lecturerId` and `createdAt` are immutable after creation.
3. **Join Code Integrity**: `classJoinCodes/{joinCode}` can only be created or deleted by the `lecturerId` of the target `UniversityClass`. Only exact-key `get` is permitted for signed-in users; `list` is strictly denied to prevent code scraping.
4. **Enrollment Integrity**: A student may enroll in a class only if `exists(/databases/$(database)/documents/classes/$(classId))` and `studentId == request.auth.uid`, with `status == 'active'`. Students cannot tamper with `attendanceCount` or `lecturerId`.
5. **Content Authoring**: Only the class `lecturerId` can create, edit, or delete `posts`, `resources`, and `assignments` inside `classes/{classId}`.
6. **Submission Privacy & Grading**: A student can only read, create, and update their own `submission` while `existing().status != 'graded'` (or on create), and cannot modify `grade`, `isGraded`, `feedback`, or `status` to `'graded'`. Only the `lecturerId` can grade submissions.
7. **Temporal Integrity**: All `createdAt`, `joinedAt`, `submittedAt`, and `updatedAt` fields must match `request.time` on creation/update.

## 2. The "Dirty Dozen" Attack Payloads
1. **Identity Spoofing on Class Creation**: `{ lecturerId: "victim_uid", title: "Fake Class" }` -> `PERMISSION_DENIED`.
2. **Shadow Field Injection on User Profile**: `{ uid: "u1", displayName: "A", email: "a@b.com", role: "docente", isAdmin: true }` -> `PERMISSION_DENIED`.
3. **Unverified Email Write**: Authenticated user with `email_verified: false` attempting `create` on `/classes/{id}` -> `PERMISSION_DENIED`.
4. **Path ID Poisoning**: Document ID of 250 characters or containing `$` / `.` -> `PERMISSION_DENIED`.
5. **PII Scraping**: Signed-in student calling `get` or `list` on `/users/{otherUid}` -> `PERMISSION_DENIED`.
6. **Join Code Enumeration**: Signed-in user calling `list` on `/classJoinCodes` -> `PERMISSION_DENIED`.
7. **Self-Grading Attack**: Student updating `/classes/c1/assignments/a1/submissions/{myUid}` with `{ grade: 20, isGraded: true, status: "graded" }` -> `PERMISSION_DENIED`.
8. **Post-Grading Tampering**: Student modifying `submissionUrl` after `status == "graded"` -> `PERMISSION_DENIED`.
9. **Attendance Forgery**: Student updating `/classes/c1/enrollments/{myUid}` with `{ attendanceCount: 999 }` -> `PERMISSION_DENIED`.
10. **Orphaned Post Creation**: Non-lecturer or lecturer of another class creating a post under `/classes/otherClassId/posts/p1` -> `PERMISSION_DENIED`.
11. **Timestamp Forgery**: Client sending `createdAt: "2020-01-01T00:00:00Z"` instead of server `request.time` -> `PERMISSION_DENIED`.
12. **Comment Role Spoofing**: Student posting a comment with `authorRole: "docente"` -> `PERMISSION_DENIED`.
