INSERT INTO users (name, email, password_hash, role, "isEmailVerified")
VALUES (
  'Load Tester',
  'loadtest@gmu.edu',
  '$2b$10$rRNVZGD91.gBxRF/UfpSFOL6HlNkN/ohqCwKl12qmdR9X8sNMznde',
  'student',
  true
)
ON CONFLICT (email) DO NOTHING
RETURNING id, email;
