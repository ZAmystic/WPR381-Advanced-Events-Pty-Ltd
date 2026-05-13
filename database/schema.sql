-- ============================================================
--  EventHub Database Schema
--  WPR381 - Advanced Events Pty Ltd
-- ============================================================

CREATE DATABASE IF NOT EXISTS eventhub;
USE eventhub;

-- ------------------------------------------------------------
-- USERS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)        NOT NULL,
    email       VARCHAR(150)        NOT NULL UNIQUE,
    password    VARCHAR(255)        NOT NULL,   -- bcrypt hash
    role        ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at  TIMESTAMP           NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- EVENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    title            VARCHAR(200)   NOT NULL,
    description      TEXT           NOT NULL,
    date             DATE           NOT NULL,
    venue            VARCHAR(200)   NOT NULL,
    price            DECIMAL(10,2)  NOT NULL DEFAULT 0.00,
    capacity         INT            NOT NULL,
    tickets_sold     INT            NOT NULL DEFAULT 0,
    category         VARCHAR(100)   NOT NULL,
    image_url        VARCHAR(500)            DEFAULT NULL,
    created_by       INT                     DEFAULT NULL,
    created_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_event_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- BOOKINGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    user_id      INT            NOT NULL,
    event_id     INT            NOT NULL,
    status       ENUM('confirmed','cancelled','pending') NOT NULL DEFAULT 'pending',
    booked_at    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_booking_user  FOREIGN KEY (user_id)  REFERENCES users(id)  ON DELETE CASCADE,
    CONSTRAINT fk_booking_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    CONSTRAINT uq_user_event    UNIQUE (user_id, event_id)   -- one booking per user per event
);

-- ------------------------------------------------------------
-- CONTACT MESSAGES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100)  NOT NULL,
    email       VARCHAR(150)  NOT NULL,
    message     TEXT          NOT NULL,
    sent_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- SEED DATA (optional demo rows)
-- ------------------------------------------------------------
INSERT INTO users (name, email, password, role) VALUES
  ('Admin User',  'admin@eventhub.co.za',  '$2b$10$examplehashedpassword1', 'admin'),
  ('Jane Doe',    'jane@example.com',       '$2b$10$examplehashedpassword2', 'user');

INSERT INTO events (title, description, date, venue, price, capacity, category, created_by) VALUES
  ('Tech Conference 2026', 'A full day of talks and networking.',        '2026-07-20', 'Cape Town Convention Centre', 450.00, 500,  'Conference', 1),
  ('Music Festival',       'Live performances from top local artists.',  '2026-06-12', 'Johannesburg Amphitheatre',   200.00, 2000, 'Festival',   1),
  ('Business Workshop',    'Practical skills for entrepreneurs.',        '2026-08-05', 'Sandton Conference Hub',      150.00, 100,  'Workshop',   1);
