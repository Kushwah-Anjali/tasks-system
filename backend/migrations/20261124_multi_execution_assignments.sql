-- Add independent work and review state to execution assignments.
-- Existing lead_assignments rows and activity history remain intact.
DELIMITER $$
DROP PROCEDURE IF EXISTS add_multi_execution_assignment_schema_if_needed$$
CREATE PROCEDURE add_multi_execution_assignment_schema_if_needed()
BEGIN
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND COLUMN_NAME='work_status') THEN
    ALTER TABLE lead_assignments ADD COLUMN work_status VARCHAR(24) NOT NULL DEFAULT 'assigned' AFTER ended_reason;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND COLUMN_NAME='latest_update') THEN
    ALTER TABLE lead_assignments ADD COLUMN latest_update VARCHAR(1000) NULL AFTER work_status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND COLUMN_NAME='submitted_at') THEN
    ALTER TABLE lead_assignments ADD COLUMN submitted_at DATETIME NULL AFTER latest_update;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND COLUMN_NAME='reviewed_at') THEN
    ALTER TABLE lead_assignments ADD COLUMN reviewed_at DATETIME NULL AFTER submitted_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND COLUMN_NAME='reviewed_by_user_id') THEN
    ALTER TABLE lead_assignments ADD COLUMN reviewed_by_user_id INT NULL AFTER reviewed_at;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND COLUMN_NAME='review_instruction') THEN
    ALTER TABLE lead_assignments ADD COLUMN review_instruction VARCHAR(1000) NULL AFTER reviewed_by_user_id;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND COLUMN_NAME='active_execution_user_id') THEN
    ALTER TABLE lead_assignments ADD COLUMN active_execution_user_id INT
      GENERATED ALWAYS AS (CASE WHEN assignment_type = 'execution' AND ended_at IS NULL THEN user_id ELSE NULL END) STORED;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND INDEX_NAME='uq_lead_active_execution_employee') THEN
    ALTER TABLE lead_assignments ADD UNIQUE KEY uq_lead_active_execution_employee (lead_id, active_execution_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND INDEX_NAME='idx_lead_assignments_active_status') THEN
    ALTER TABLE lead_assignments ADD KEY idx_lead_assignments_active_status (lead_id, assignment_type, ended_at, work_status);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME='lead_assignments' AND CONSTRAINT_NAME='fk_lead_assignment_reviewer') THEN
    ALTER TABLE lead_assignments ADD CONSTRAINT fk_lead_assignment_reviewer FOREIGN KEY (reviewed_by_user_id) REFERENCES users(id) ON DELETE RESTRICT;
  END IF;
END$$
DELIMITER ;

CALL add_multi_execution_assignment_schema_if_needed();
DROP PROCEDURE add_multi_execution_assignment_schema_if_needed;

CREATE TABLE IF NOT EXISTS lead_assignment_events (
  id INT NOT NULL AUTO_INCREMENT,
  assignment_id INT NOT NULL,
  lead_id INT NOT NULL,
  actor_user_id INT NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  message VARCHAR(1000) NOT NULL,
  metadata JSON NULL,
  request_key VARCHAR(64) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lead_assignment_event_request (assignment_id, request_key),
  KEY idx_lead_assignment_events_timeline (assignment_id, created_at, id),
  CONSTRAINT fk_lead_assignment_events_assignment FOREIGN KEY (assignment_id) REFERENCES lead_assignments(id) ON DELETE RESTRICT,
  CONSTRAINT fk_lead_assignment_events_lead FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE RESTRICT,
  CONSTRAINT fk_lead_assignment_events_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Carry forward legacy lead-wide pending execution submissions onto their sole current work row.
UPDATE lead_assignments a
INNER JOIN leads l ON l.id = a.lead_id
   SET a.work_status = 'submitted',
       a.latest_update = l.latest_remark,
       a.submitted_at = COALESCE(l.work_review_submitted_at, l.updated_at)
 WHERE a.assignment_type = 'execution'
   AND a.ended_at IS NULL
   AND l.status = 'Working'
   AND l.work_review_pending = 1
   AND a.work_status = 'assigned';

-- Preserve assignment-linked submission and review history in the new assignment timeline.
INSERT IGNORE INTO lead_assignment_events
  (assignment_id, lead_id, actor_user_id, event_type, message, metadata, request_key, created_at)
SELECT a.id, h.lead_id, h.actor_user_id, h.event_type, h.message, h.metadata,
       CONCAT('legacy_', h.id), h.created_at
  FROM lead_activities h
  INNER JOIN lead_assignments a
    ON a.id = CAST(JSON_UNQUOTE(JSON_EXTRACT(h.metadata, '$.assignmentId')) AS UNSIGNED)
   AND a.lead_id = h.lead_id
 WHERE h.event_type IN ('employee_update_submitted', 'execution_review_returned', 'execution_review_acknowledged');
