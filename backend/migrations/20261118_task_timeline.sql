-- Record lifecycle events that are not represented by task_handoffs.
-- Existing tasks and task_handoffs are untouched; legacy forwarding history
-- continues to be read from task_handoffs.

CREATE TABLE IF NOT EXISTS task_events (
    id INT NOT NULL AUTO_INCREMENT,
    task_id INT NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    actor_user_id INT NOT NULL,
    recipient_user_id INT NULL,
    previous_assignee_user_id INT NULL,
    source_handoff_id INT NULL,
    message TEXT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_task_events_timeline (task_id, created_at, id),
    UNIQUE KEY uq_task_events_handoff_event (source_handoff_id, event_type),
    CONSTRAINT fk_task_events_task
        FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
    CONSTRAINT fk_task_events_source_handoff
        FOREIGN KEY (source_handoff_id) REFERENCES task_handoffs (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
