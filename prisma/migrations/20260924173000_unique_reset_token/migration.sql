-- Add a unique constraint on the hashed reset token so each token can be
-- looked up unambiguously in the reset flow (findUnique by token_hash).
CREATE UNIQUE INDEX "PasswordResetToken_token_hash_key" ON "PasswordResetToken"("token_hash");