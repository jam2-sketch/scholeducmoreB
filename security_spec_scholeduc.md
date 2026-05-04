# Security Specification for Lumina Classroom

## Data Invariants
1. A user cannot join a class without an enrollment record.
2. Only the owner of a class (Teacher) can create assignments or delete the class.
3. Students can only see their own submissions.
4. All messages/posts must have a valid authorId matching the currently signed-in user.
5. All timestamps must use server-side `request.time`.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a user profile with a different UID.
2. **Role Escalation**: Attempt to update own user profile role from 'student' to 'teacher'.
3. **Class Takeover**: Attempt to update a class `ownerId` to yourself.
4. **Phantom Assignment**: Attempt to create an assignment in a class you don't own.
5. **Grade Injection**: Attempt to grade your own submission as a student.
6. **Join Code Brute-force**: Attempt to list all classes to find open join codes (mitigated by rules requiring knowledge of ID).
7. **Cross-Class Posting**: Attempt to post to a class you are not enrolled in.
8. **Comment Deletion**: Attempt to delete a teacher's comment as a student.
9. **Submission Update Gap**: Attempt to change the `studentId` of a submission.
10. **Shadow Field Injection**: Attempt to create a class with extra hidden fields like `isVerified: true`.
11. **ID Poisoning**: Attempt to use a 1MB string as a `classId`.
12. **Future Timestamp**: Attempt to set `createdAt` directly in the past or future.

## Test Runner
The tests are implemented in `firestore.rules.test.ts` to verify these rejections.
