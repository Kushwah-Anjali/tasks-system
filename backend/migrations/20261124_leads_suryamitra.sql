-- Add the dedicated Suryamitra name field to existing Leads schemas.
-- The legacy commission column is deliberately preserved and never copied or reinterpreted.
DELIMITER $$
DROP PROCEDURE IF EXISTS add_leads_suryamitra_if_needed$$
CREATE PROCEDURE add_leads_suryamitra_if_needed()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'leads'
       AND COLUMN_NAME = 'suryamitra'
  ) THEN
    ALTER TABLE `leads` ADD COLUMN `suryamitra` VARCHAR(160) NULL AFTER `channel_partner`;
  END IF;
END$$
DELIMITER ;

CALL add_leads_suryamitra_if_needed();
DROP PROCEDURE add_leads_suryamitra_if_needed;
