-- Add admin to users.role only when role is an ENUM that does not already include it.
-- Existing role values, nullability, default, and collation are retained.
DELIMITER $$
DROP PROCEDURE IF EXISTS add_admin_role_if_needed$$
CREATE PROCEDURE add_admin_role_if_needed()
BEGIN
  DECLARE role_type VARCHAR(64);
  DECLARE role_definition TEXT;
  DECLARE role_nullable VARCHAR(3);
  DECLARE role_default TEXT;
  DECLARE role_collation VARCHAR(64);
  DECLARE modified_definition TEXT;

  SELECT DATA_TYPE, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLLATION_NAME
    INTO role_type, role_definition, role_nullable, role_default, role_collation
    FROM INFORMATION_SCHEMA.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE()
     AND TABLE_NAME = 'users'
     AND COLUMN_NAME = 'role'
   LIMIT 1;

  IF role_type = 'enum' AND LOCATE("'admin'", role_definition) = 0 THEN
    SET modified_definition = CONCAT(
      LEFT(role_definition, CHAR_LENGTH(role_definition) - 1),
      ",'admin')"
    );
    SET @admin_role_ddl = CONCAT(
      'ALTER TABLE `users` MODIFY COLUMN `role` ', modified_definition,
      IF(role_collation IS NULL, '', CONCAT(' COLLATE ', role_collation)),
      IF(role_nullable = 'YES', ' NULL', ' NOT NULL'),
      IF(role_default IS NULL, '', CONCAT(' DEFAULT ', QUOTE(role_default)))
    );
    PREPARE admin_role_stmt FROM @admin_role_ddl;
    EXECUTE admin_role_stmt;
    DEALLOCATE PREPARE admin_role_stmt;
  END IF;
END$$
DELIMITER ;

CALL add_admin_role_if_needed();
DROP PROCEDURE add_admin_role_if_needed;
