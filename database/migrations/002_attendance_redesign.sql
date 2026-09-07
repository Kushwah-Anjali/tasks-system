-- 002_attendance_redesign.sql
-- Safe migration for the live production database.
-- IMPORTANT: Take a backup before running this migration.

SET @db := DATABASE();

-- users.can_manage_attendance
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'users'
  AND COLUMN_NAME = 'can_manage_attendance';

SET @sql := IF(
  @exists_col = 0,
  'ALTER TABLE users ADD COLUMN can_manage_attendance TINYINT(1) NOT NULL DEFAULT 0',
  'SELECT ''users.can_manage_attendance already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- attendance.is_late
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND COLUMN_NAME = 'is_late';

SET @sql := IF(
  @exists_col = 0,
  'ALTER TABLE attendance ADD COLUMN is_late TINYINT(1) NOT NULL DEFAULT 0 AFTER status',
  'SELECT ''attendance.is_late already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- attendance.late_time
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND COLUMN_NAME = 'late_time';

SET @sql := IF(
  @exists_col = 0,
  'ALTER TABLE attendance ADD COLUMN late_time TIME NULL AFTER is_late',
  'SELECT ''attendance.late_time already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- attendance.marked_by
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND COLUMN_NAME = 'marked_by';

SET @sql := IF(
  @exists_col = 0,
  'ALTER TABLE attendance ADD COLUMN marked_by INT NULL AFTER late_time',
  'SELECT ''attendance.marked_by already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- attendance.created_at
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND COLUMN_NAME = 'created_at';

SET @sql := IF(
  @exists_col = 0,
  'ALTER TABLE attendance ADD COLUMN created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP AFTER marked_by',
  'SELECT ''attendance.created_at already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- attendance.updated_at
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND COLUMN_NAME = 'updated_at';

SET @sql := IF(
  @exists_col = 0,
  'ALTER TABLE attendance ADD COLUMN updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
  'SELECT ''attendance.updated_at already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove old check_in
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND COLUMN_NAME = 'check_in';

SET @sql := IF(
  @exists_col = 1,
  'ALTER TABLE attendance DROP COLUMN check_in',
  'SELECT ''attendance.check_in already removed'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove old check_out
SELECT COUNT(*) INTO @exists_col
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND COLUMN_NAME = 'check_out';

SET @sql := IF(
  @exists_col = 1,
  'ALTER TABLE attendance DROP COLUMN check_out',
  'SELECT ''attendance.check_out already removed'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure unique index
SELECT COUNT(*) INTO @exists_idx
FROM information_schema.STATISTICS
WHERE TABLE_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND INDEX_NAME = 'unique_employee_attendance';

SET @sql := IF(
  @exists_idx = 0,
  'ALTER TABLE attendance ADD CONSTRAINT unique_employee_attendance UNIQUE (employee_id, attendance_date)',
  'SELECT ''unique_employee_attendance already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ensure marked_by foreign key
SELECT COUNT(*) INTO @exists_fk
FROM information_schema.TABLE_CONSTRAINTS
WHERE CONSTRAINT_SCHEMA = @db
  AND TABLE_NAME = 'attendance'
  AND CONSTRAINT_NAME = 'fk_attendance_marked_by'
  AND CONSTRAINT_TYPE = 'FOREIGN KEY';

SET @sql := IF(
  @exists_fk = 0,
  'ALTER TABLE attendance ADD CONSTRAINT fk_attendance_marked_by FOREIGN KEY (marked_by) REFERENCES users(id) ON DELETE SET NULL',
  'SELECT ''fk_attendance_marked_by already exists'' AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Final verification
SELECT DATABASE() AS migrated_database;
SHOW COLUMNS FROM users LIKE 'can_manage_attendance';
SHOW COLUMNS FROM attendance;
