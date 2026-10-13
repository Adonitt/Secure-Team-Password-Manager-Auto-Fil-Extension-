ALTER TABLE users ADD COLUMN first_name VARCHAR(100);
ALTER TABLE users ADD COLUMN last_name VARCHAR(100);

-- Preserve existing demo accounts when upgrading an already-used database.
UPDATE users
SET first_name = COALESCE(NULLIF(initcap(split_part(email, '@', 1)), ''), 'Demo'),
    last_name = 'User'
WHERE first_name IS NULL OR last_name IS NULL;

ALTER TABLE users ALTER COLUMN first_name SET NOT NULL;
ALTER TABLE users ALTER COLUMN last_name SET NOT NULL;
