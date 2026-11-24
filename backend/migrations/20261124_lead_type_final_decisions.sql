-- Add explicit lead type and held phase. Existing lead types remain NULL, so the API
-- displays them as "Not specified" without guessing a classification.
DELIMITER $$
DROP PROCEDURE IF EXISTS add_lead_type_and_held_phase_if_needed$$
CREATE PROCEDURE add_lead_type_and_held_phase_if_needed()
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'lead_type'
  ) THEN
    ALTER TABLE `leads` ADD COLUMN `lead_type` VARCHAR(20) NULL AFTER `suryamitra`;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'leads' AND COLUMN_NAME = 'held_from_status'
  ) THEN
    ALTER TABLE `leads` ADD COLUMN `held_from_status` VARCHAR(24) NULL AFTER `status`;
  END IF;
END$$
DELIMITER ;

CALL add_lead_type_and_held_phase_if_needed();
DROP PROCEDURE add_lead_type_and_held_phase_if_needed;

-- Reconcile only manager decisions demonstrably recorded as Final. The original
-- activity row and finalized_at are retained; no confirmation event is fabricated.
UPDATE leads l
INNER JOIN (
  SELECT DISTINCT a.lead_id
    FROM lead_activities a
    INNER JOIN users actor ON actor.id = a.actor_user_id
   WHERE actor.role = 'manager'
     AND a.event_type = 'manager_status_changed'
     AND JSON_UNQUOTE(JSON_EXTRACT(a.metadata, '$.to')) = 'Final'
) manager_final ON manager_final.lead_id = l.id
   SET l.needs_creator_review = 0,
       l.review_kind = NULL,
       l.version = l.version + 1
 WHERE l.status = 'Final'
   AND l.needs_creator_review = 1
   AND l.review_kind = 'final_confirmation';
