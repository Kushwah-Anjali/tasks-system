CREATE TABLE employees (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    registration_number VARCHAR(50) NOT NULL UNIQUE,
    date_of_birth DATE,
    department_id INT,
    designation VARCHAR(100),
    joining_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_employee_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_employee_department
        FOREIGN KEY (department_id)
        REFERENCES departments(id)
        ON DELETE SET NULL
);