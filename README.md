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

| Model            | Description                                                                             
|------------------|-----------------------------------------------------------------------------
| User             | Registered users (role: user / admin). Password hashed with bcrypt (12 salt rounds). Soft-delete via `isActive` flag.
| Event            | Events with nested venue sub-schema, capacity, status lifecycle (draft → published → cancelled / completed), full-text search index on title, description & tags.
| Booking          | Ticket reservations with atomic capacity management via `findOneAndUpdate`. Stores `ticketCount`, `totalPrice`, `eventSnapshot`, and a generated `confirmationCode` (e.g. `EVH-A3K9P2`).
| Review           | Star ratings (1–5) per event. Post-save hook auto-recalculates the event's average rating via aggregation. One review per user per event (compound unique index).
| ContactMessage   | Messages from the contact form. Supports `isRead` flag for the admin inbox. Optionally linked to a registered user.

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

-----

## Key Implementation Details

### Authentication & Security

- Passwords are hashed with **bcryptjs** at 12 salt rounds inside a Mongoose `pre('save')` hook — plaintext is never stored.
- `password` field uses `select: false` so it is never returned in queries unless explicitly requested with `.select('+password')`.
- Sessions are managed with **express-session** and stored in MongoDB via **connect-mongo**.
- Three middleware guards protect routes:
  - `requireAuth` — redirects unauthenticated users to `/login`
  - `requireAdmin` — returns 403 for non-admin sessions
  - `attachUser` — populates `res.locals.currentUser` for all EJS templates

### Atomic Capacity Management

Overbooking is prevented without relying on transactions for the check step. The booking controller uses a conditional `findOneAndUpdate` that only increments `bookedCount` when space is available:

```js
Event.findOneAndUpdate(
  {
    _id: req.params.id,
    status: 'published',
    $expr: { $lte: [{ $add: ['$bookedCount', ticketCount] }, '$capacity'] }
  },
  { $inc: { bookedCount: ticketCount } },
  { new: true, session }
)
```

The full booking creation (event update + booking document insert) is wrapped in a **MongoDB transaction** for consistency. Cancellations also use a transaction to return tickets to the pool atomically.

### Duplicate Booking Prevention

A **partial unique index** on `{ user, event }` where `status` is `pending` or `confirmed` prevents a user from booking the same event twice while allowing cancellations and re-bookings.

### Event Lifecycle & Virtuals

Events expose three computed virtuals (not stored in the database):

| Virtual             | Description                                  |
|---------------------|----------------------------------------------|
| `availableTickets`  | `capacity - bookedCount`                     |
| `isSoldOut`         | `bookedCount >= capacity`                    |
| `percentageFilled`  | Rounded percentage of capacity used          |

A `pre('save')` hook automatically sets status to `completed` when the event date passes.

### Full-Text Search

Events are indexed for full-text search across `title`, `description`, and `tags`:

```js
eventSchema.index({ title: 'text', description: 'text', tags: 'text' });
```

The `Event.search(query)` static method uses `$text: { $search: query }` with relevance scoring.

### Review Ratings

After every review save or delete, the `recalcEventRating()` static runs an aggregation pipeline to recompute the event's `averageRating` and `reviewCount` fields automatically.

---

## API Routes Reference

| Method | Route                          | Access     | Description                        |
|--------|--------------------------------|------------|------------------------------------|
| GET    | `/`                            | Public     | Homepage with published events     |
| GET    | `/events/:id`                  | Public     | Event detail page                  |
| GET    | `/register`                    | Public     | Registration form                  |
| POST   | `/register`                    | Public     | Create account                     |
| GET    | `/login`                       | Public     | Login form                         |
| POST   | `/login`                       | Public     | Authenticate user                  |
| GET    | `/logout`                      | Auth       | Destroy session                    |
| GET    | `/dashboard`                   | Auth       | User booking history               |
| POST   | `/events/:id/book`             | Auth       | Book tickets (atomic)              |
| POST   | `/bookings/:id/cancel`         | Auth       | Cancel a booking                   |
| GET    | `/contact`                     | Public     | Contact form                       |
| POST   | `/contact`                     | Public     | Submit enquiry                     |
| GET    | `/admin/events`                | Admin      | List all events                    |
| GET    | `/admin/events/create`         | Admin      | Create event form                  |
| POST   | `/admin/events/create`         | Admin      | Save new event                     |
| GET    | `/admin/events/:id/edit`       | Admin      | Edit event form                    |
| POST   | `/admin/events/:id/edit`       | Admin      | Update event                       |
| POST   | `/admin/events/:id/delete`     | Admin      | Soft-cancel event (status → cancelled) |
| GET    | `/admin/messages`              | Admin      | View all contact enquiries         |
| POST   | `/admin/messages/:id/read`     | Admin      | Mark enquiry as read               |

-----

## Mongoose Schema Highlights

### User

- `name`, `email` (unique, lowercase), `password` (select: false), `role` (user/admin)
- `isActive` soft-delete flag, `lastLogin` timestamp
- Virtual `initials` for avatar fallback
- Virtual `bookings` population reference
- Instance method `comparePassword(candidate)` using `bcrypt.compare`
- Static `findActive()` helper

### Event

- Nested `venue` sub-schema (name, address, city, province, country)
- `category` enum: Conference, Festival, Workshop, Concert, Exhibition, Networking, Sports, Other
- `status` enum: draft, published, cancelled, completed
- `slug` auto-generated from title + timestamp on save
- `isFeatured` flag with `findFeatured(limit)` static
- `hasAvailability()` instance method checks status, capacity, and date

### Booking

- `ticketCount` (1–10), `totalPrice` frozen at booking time
- `eventSnapshot` preserves title, date, venue, price against future edits
- `confirmationCode` generated from unambiguous charset (no 0/O/I/1): format `EVH-XXXXXX`
- `cancelledAt` stamped automatically on status change to `cancelled`
- Static `findForUser(userId)` and `findForEvent(eventId)` with population

### ContactMessage

- `isRead` boolean for admin inbox workflow
- Optional `user` reference if sender is a registered account
- Static `findUnread()` helper

-----

## Team Members and Roles

| Name | Role |
|------|------|
| Theart Gerhardus Jooste | Team Lead / Project Coordinator
| Lindokuhle Shangase | Backend Developer
| Elcke Van Der Berg & Steven Riaan Piek | Frontend Developer 
| Nhlavutelo Shiviri | Database Engineer
| Theart Gerhardus Jooste | Security / DevOps Engineer
| Dylan James Spurrier | QA & Testing Engineer

-----








