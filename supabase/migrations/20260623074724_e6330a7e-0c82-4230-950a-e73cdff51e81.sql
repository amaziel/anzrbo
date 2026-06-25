DO $$
BEGIN
  -- Rotate seeded admin passwords to strong random secrets (unrecoverable from code).
  -- Admins must reset via Supabase Auth dashboard or password-reset flow.
  UPDATE auth.users
  SET encrypted_password = crypt(encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
      updated_at = now()
  WHERE email IN ('inoceadmin@miprojet.local', 'adminmgec@mugec-ci.local');
END $$;