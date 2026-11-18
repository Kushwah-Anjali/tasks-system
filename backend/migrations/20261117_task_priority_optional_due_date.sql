-- Task priority and optional due dates.
-- Priority uses the lowercase values accepted by the backend; "medium" is
-- displayed as Medium and is assigned to every existing task by this default.
-- Each ALTER is conditional so this migration can safely be rerun.

SET @priority_column_exists = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tasks'
      AND COLUMN_NAME = 'priority'
);
SET @priority_migration_sql = IF(
    @priority_column_exists = 0,
    'ALTER TABLE `tasks` ADD COLUMN `priority` ENUM(''high'', ''medium'', ''low'') NOT NULL DEFAULT ''medium'' AFTER `title`',
    'SELECT ''tasks.priority already exists'' AS migration_status'
);
PREPARE priority_migration_statement FROM @priority_migration_sql;
EXECUTE priority_migration_statement;
DEALLOCATE PREPARE priority_migration_statement;

SET @due_date_is_required = (
    SELECT COUNT(*)
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'tasks'
      AND COLUMN_NAME = 'due_date'
      AND IS_NULLABLE = 'NO'
);
SET @due_date_migration_sql = IF(
    @due_date_is_required = 1,
    'ALTER TABLE `tasks` MODIFY COLUMN `due_date` DATE NULL',
    'SELECT ''tasks.due_date already allows NULL'' AS migration_status'
);
PREPARE due_date_migration_statement FROM @due_date_migration_sql;
EXECUTE due_date_migration_statement;
DEALLOCATE PREPARE due_date_migration_statement;
