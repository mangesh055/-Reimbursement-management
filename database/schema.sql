-- ============================================================
-- ReimburseAI Full Database Schema
-- ============================================================

CREATE DATABASE IF NOT EXISTS reimburse_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE reimburse_ai;

CREATE TABLE IF NOT EXISTS companies (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    country         VARCHAR(100) NOT NULL,
    currency_code   CHAR(3) NOT NULL DEFAULT 'USD',
    currency_symbol VARCHAR(10) NOT NULL DEFAULT '$',
    logo_url        VARCHAR(500) DEFAULT NULL,
    expense_policy_text TEXT DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            ENUM('admin','manager','employee') NOT NULL DEFAULT 'employee',
    manager_id      INT UNSIGNED DEFAULT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    avatar_url      VARCHAR(500) DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_email_company (email, company_id),
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expenses (
    id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id                  INT UNSIGNED NOT NULL,
    employee_id                 INT UNSIGNED NOT NULL,
    title                       VARCHAR(255) NOT NULL,
    amount                      DECIMAL(12,2) NOT NULL,
    currency                    CHAR(3) NOT NULL,
    amount_in_company_currency  DECIMAL(12,2) NOT NULL,
    exchange_rate               DECIMAL(12,6) NOT NULL DEFAULT 1.000000,
    category                    ENUM('Travel','Meals','Accommodation','Office Supplies','Entertainment','Training','Medical','Miscellaneous') NOT NULL DEFAULT 'Miscellaneous',
    ai_suggested_category       VARCHAR(100) DEFAULT NULL,
    ai_category_confidence      DECIMAL(5,2) DEFAULT NULL,
    description                 TEXT DEFAULT NULL,
    expense_date                DATE NOT NULL,
    receipt_url                 VARCHAR(500) DEFAULT NULL,
    ocr_raw_data                JSON DEFAULT NULL,
    vendor_name                 VARCHAR(255) DEFAULT NULL,
    policy_flags                JSON DEFAULT NULL,
    risk_score                  TINYINT UNSIGNED DEFAULT 0,
    risk_reason                 TEXT DEFAULT NULL,
    is_duplicate_flag           BOOLEAN NOT NULL DEFAULT FALSE,
    duplicate_of_expense_id     INT UNSIGNED DEFAULT NULL,
    status                      ENUM('draft','pending','approved','rejected','cancelled') NOT NULL DEFAULT 'draft',
    current_approver_id         INT UNSIGNED DEFAULT NULL,
    current_approval_step       INT UNSIGNED DEFAULT 0,
    rejection_reason            TEXT DEFAULT NULL,
    submitted_at                DATETIME DEFAULT NULL,
    approved_at                 DATETIME DEFAULT NULL,
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id)  REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (current_approver_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (duplicate_of_expense_id) REFERENCES expenses(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS approval_rules (
    id                          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id                  INT UNSIGNED NOT NULL,
    name                        VARCHAR(255) NOT NULL,
    description                 TEXT DEFAULT NULL,
    category                    VARCHAR(100) DEFAULT NULL,
    min_amount                  DECIMAL(12,2) DEFAULT NULL,
    max_amount                  DECIMAL(12,2) DEFAULT NULL,
    is_manager_approver         BOOLEAN NOT NULL DEFAULT TRUE,
    approval_mode               ENUM('sequential','conditional','hybrid') NOT NULL DEFAULT 'sequential',
    minimum_approval_percentage TINYINT UNSIGNED DEFAULT NULL,
    specific_approver_id        INT UNSIGNED DEFAULT NULL,
    is_active                   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id)           REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (specific_approver_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS approval_rule_approvers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    rule_id         INT UNSIGNED NOT NULL,
    user_id         INT UNSIGNED NOT NULL,
    sequence_order  INT UNSIGNED NOT NULL DEFAULT 1,
    is_required     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_rule_user (rule_id, user_id),
    FOREIGN KEY (rule_id) REFERENCES approval_rules(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS expense_approvals (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    expense_id      INT UNSIGNED NOT NULL,
    rule_id         INT UNSIGNED DEFAULT NULL,
    approver_id     INT UNSIGNED NOT NULL,
    sequence_order  INT UNSIGNED NOT NULL DEFAULT 1,
    status          ENUM('pending','approved','rejected','skipped') NOT NULL DEFAULT 'pending',
    comments        TEXT DEFAULT NULL,
    ai_assist_shown BOOLEAN NOT NULL DEFAULT FALSE,
    ai_assist_text  TEXT DEFAULT NULL,
    actioned_at     DATETIME DEFAULT NULL,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (expense_id)  REFERENCES expenses(id) ON DELETE CASCADE,
    FOREIGN KEY (approver_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (rule_id)     REFERENCES approval_rules(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS budgets (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id      INT UNSIGNED NOT NULL,
    department_name VARCHAR(255) NOT NULL,
    category        VARCHAR(100) DEFAULT NULL,
    budget_amount   DECIMAL(12,2) NOT NULL,
    period          ENUM('monthly','quarterly','yearly') NOT NULL DEFAULT 'monthly',
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    company_id  INT UNSIGNED NOT NULL,
    user_id     INT UNSIGNED DEFAULT NULL,
    action      VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id   INT UNSIGNED NOT NULL,
    details     JSON DEFAULT NULL,
    ip_address  VARCHAR(45) DEFAULT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)    REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS notifications (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED NOT NULL,
    title       VARCHAR(255) NOT NULL,
    body        TEXT DEFAULT NULL,
    is_read     BOOLEAN NOT NULL DEFAULT FALSE,
    expense_id  INT UNSIGNED DEFAULT NULL,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exchange_rate_cache (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    base_currency   CHAR(3) NOT NULL,
    rates_json      JSON NOT NULL,
    fetched_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_base_fetched (base_currency, fetched_at)
);
