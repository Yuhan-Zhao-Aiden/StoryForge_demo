# StoryForge Database Guide

This document describes the current database design and usage patterns
for **users**, **rooms**, **roomMembers**, **nodes**, and **edges**.

------------------------------------------------------------------------

## Overview

-   **Database:** MongoDB (Atlas or self-hosted)
-   **Database name:** `appdb_dev`
-   **Collections:** `users`, `rooms`, `roomMembers`, `nodes`, `edges`
-   **ID type:** `ObjectId` (stored as strings in API responses)
-   **Validation:** JSON Schema validators with
    `validationLevel: "moderate"`
-   **Indexes:** Created for uniqueness and query performance

------------------------------------------------------------------------

## Users Collection

Prisma-aligned model:

``` prisma
model User {
  id            String   @id @default(auto()) @map("_id") @db.ObjectId
  username      String   @unique
  email         String   @unique
  password      String          // bcrypt hash
  newsletter    Boolean  @default(false)
  emailVerified Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  @@map("users")
}
```

**Notes** - `password` stores a **bcrypt hash** - OAuth support:
generate a disabled/random hash if needed - `emailVerified` is a boolean
flag

**Example document**

``` json
{
  "_id": { "$oid": "68d3a82e20ade5c1bdd49c06" },
  "username": "Ming123",
  "email": "ming123@gmail.com",
  "password": "$2a$12$...",
  "newsletter": false,
  "emailVerified": false,
  "createdAt": { "$date": "2025-09-24T00:00:00Z" },
  "updatedAt": { "$date": "2025-09-24T00:00:00Z" }
}
```

------------------------------------------------------------------------

## Rooms Collection

``` js
{
  _id: ObjectId,
  ownerId: ObjectId,               // FK to users._id
  title: String,
  subtitle: String | null,         // NEW
  collaborators: Number,           // cached count of non-owner members
  slug: String | null,
  visibility: "private" | "unlisted" | "public",
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes** - `{ ownerId, createdAt }` - `{ slug }` unique, sparse

**Example document**

``` json
{
  "_id": { "$oid": "650000000000000000000001" },
  "ownerId": { "$oid": "68d3a82e20ade5c1bdd49c06" },
  "title": "The Lighthouse Mystery",
  "subtitle": "A dark tale of secrets hidden in an old lighthouse…",
  "collaborators": 4,
  "slug": "the-lighthouse-mystery",
  "visibility": "private",
  "createdAt": { "$date": "2025-09-24T00:00:00Z" },
  "updatedAt": { "$date": "2025-09-24T00:00:00Z" }
}
```

------------------------------------------------------------------------

## RoomMembers Collection

``` js
{
  _id: ObjectId,
  roomId: ObjectId,         // FK to rooms._id
  userId: ObjectId,         // FK to users._id
  role: "owner" | "editor" | "viewer",
  joinedAt: Date
}
```

**Indexes** - `{ roomId, userId }` unique - `{ userId, role }`

------------------------------------------------------------------------

## Nodes Collection

``` js
{
  _id: ObjectId,
  roomId: ObjectId,                  // FK to rooms._id
  title: String,
  content: {
    text: String | null,
    media: Array | null              // e.g. [{ type, url }]
  },
  position: { x: Number, y: Number },
  labels: [String],
  createdBy: ObjectId,               // FK to users._id
  createdAt: Date,
  updatedAt: Date
}
```

**Indexes** - `{ roomId, createdAt }` - `{ roomId, title }`

------------------------------------------------------------------------

## Edges Collection

``` js
{
  _id: ObjectId,
  roomId: ObjectId,                  // FK to rooms._id
  fromNodeId: ObjectId,              // FK to nodes._id
  toNodeId: ObjectId,                // FK to nodes._id
  type: "normal" | "choice" | "alt",
  label: String | null,
  createdAt: Date
}
```

**Indexes** - `{ roomId, fromNodeId, toNodeId }` unique -
`{ roomId, toNodeId }`

------------------------------------------------------------------------


- **Collection**: `roomInvites`
- **Purpose**: Store hashed invite codes for joining rooms without altering `rooms`.

### Required fields
- `roomId` (ObjectId) – FK to `rooms._id`
- `codeHash` (string) – SHA-256 / bcrypt / argon2 hash of the invite code
- `role` ("editor" | "viewer") – default role granted on redeem
- `uses` (int/long ≥ 0) – current usage count
- `createdBy` (ObjectId) – user who generated the invite
- `createdAt` (date)

### Optional fields
- `maxUses` (int/long | null) – null = unlimited
- `expiresAt` (date | null) – TTL target
- `disabled` (bool) – force revoke immediately

### Indexes
- Unique: `{ codeHash: 1 }`
- Secondary: `{ roomId: 1, createdAt: -1 }`
- TTL (optional): `{ expiresAt: 1 }` with `expireAfterSeconds: 0`

### Example document
```json
{
  "_id": { "$oid": "650000000000000000000abc" },
  "roomId": { "$oid": "68d43893344d65a6ff50d650" },
  "codeHash": "d0/…==",
  "role": "viewer",
  "maxUses": null,
  "uses": 0,
  "expiresAt": null,
  "createdBy": { "$oid": "68d417bd344d65a6ff50d64f" },
  "createdAt": { "$date": "2025-09-24T16:20:00Z" },
  "disabled": false
}
```

## Summary

-   **Users**: account management
-   **Rooms**: collaborative story containers
-   **RoomMembers**: links users ↔ rooms with roles
-   **Nodes**: story content blocks within a room
-   **Edges**: directional links between nodes

This schema supports **collaborative storyboarding**, showing both owned
and collaborating rooms in the user dashboard, with nodes and edges
forming interactive story graphs.
