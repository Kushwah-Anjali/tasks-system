-- Store a selected developer-controlled avatar preset per account.
-- Existing accounts remain NULL and use the deterministic client fallback.
DELIMITER $$
DROP PROCEDURE IF EXISTS add_profile_avatar_preset_if_needed$$
CREATE PROCEDURE add_profile_avatar_preset_if_needed()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'avatar_preset_id'
  ) THEN
    ALTER TABLE users ADD COLUMN avatar_preset_id VARCHAR(32) NULL AFTER full_name;
  END IF;
END$$
DELIMITER ;

CALL add_profile_avatar_preset_if_needed();
DROP PROCEDURE add_profile_avatar_preset_if_needed;
