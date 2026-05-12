# WPR381 — Advanced Events (EventHub)

A full-stack event booking platform built with **Node.js**, **Express**, **EJS**, and **MongoDB + Mongoose**.

---

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Runtime    | Node.js                             |
| Framework  | Express 5                           |
| Templates  | EJS                                 |
| Database   | MongoDB                             |
| ODM        | Mongoose 8                          |
| Auth       | express-session + bcryptjs          |
| Sessions   | connect-mongo (sessions in MongoDB) |

---

## Database Models

| Model            | Description                                         |
|------------------|-----------------------------------------------------|
| User             | Registered users (role: user / admin). Password hashed with bcrypt. |
| Event            | Events with venue, capacity, status, full-text search index. |
| Booking          | Ticket reservations with atomic capacity management. |
| Review           | Star ratings per event. Auto-updates event average rating. |
| ContactMessage   | Messages from the contact form.                     |

---

## Quick Start

### 1. Prerequisites
- Node.js >= 18
- MongoDB running locally OR a MongoDB Atlas URI

### 2. Install dependencies
```
npm install
```

### 3. Configure environment
```
cp .env.example .env
```
Edit .env and set your MONGO_URI and SESSION_SECRET.

### 4. Seed the database
```
npm run seed
```

**Seed credentials:**
- Admin:  admin@eventhub.co.za  /  Admin@123
- User:   thabo@example.co.za   /  Password123

Wipe all data:
```
npm run seed:delete
```

### 5. Run
```
npm start        # production
npm run dev      # development with nodemon
```

Open: http://localhost:3000

---

## Project Structure

```
app.js                   - Entry point
config/db.js             - MongoDB connection
models/
  index.js               - Central model export
  User.js                - User schema + bcrypt hooks
  Event.js               - Event schema + slug + full-text index
  Booking.js             - Booking schema + confirmation code
  Review.js              - Review schema + avg rating aggregation
  ContactMessage.js      - Contact form messages
controllers/
  authController.js
  eventController.js
  bookingController.js
  contactController.js
routes/
  auth.js / events.js / bookings.js / contact.js
middleware/auth.js       - requireAuth, requireAdmin, attachUser
seed/seed.js             - Database seeder
views/                   - EJS templates
public/                  - Static assets
```
