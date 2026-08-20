CREATE TABLE attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id INT NOT NULL,
    attendance_date DATE NOT NULL,
    check_in DATETIME,
    check_out DATETIME,
    status VARCHAR(20) NOT NULL,

    CONSTRAINT fk_attendance_employee
        FOREIGN KEY (employee_id)
        REFERENCES employees(id)
        ON DELETE CASCADE,

    CONSTRAINT unique_employee_attendance
        UNIQUE (employee_id, attendance_date)
);