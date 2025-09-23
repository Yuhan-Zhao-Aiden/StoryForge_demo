# 📚 StoryForge Database Documentation

**Database name:** `appdb_dev`  
**Engine:** MongoDB Atlas (shared dev cluster)  
**Style:** Document-based with references (`ObjectId`, not DBRefs)  
**Validation:** JSON Schema validators with `validationLevel: "moderate"` (flexible, additive-friendly)  
**Indexes:** Unique + TTL where needed  

---

## 1. `users` (required)

Stores application users (credentials or OAuth).

**Fields**
| Field          | Type                 | Notes |
|----------------|----------------------|-------|
| `_id`          | `ObjectId`           | Primary key |
| `email`        | `string`             | **Unique**, lowercased |
| `passwordHash` | `string`             | bcrypt hash (omit if OAuth-only) |
| `name`         | `string \| null`     | Display name |
| `image`        | `string \| null`     | Avatar URL |
| `role`         | `"user" \| "admin"`  | Access control |
| `profile`      | `object \| null`     | `{ bio, timezone }` |
| `preferences`  | `object \| null`     | `{ theme: "light" \| "dark" \| "system" }` |
| `emailVerifiedAt` | `Date \| null`    | Timestamp when verified |
| `createdAt`    | `Date`               | Creation timestamp |
| `updatedAt`    | `Date`               | Last update |

**Indexes**
- `email` unique

**Sample**
```json
{
  "_id": "ObjectId",
  "email": "demo@storyforge.dev",
  "passwordHash": "$2a$12$...",
  "name": "Demo User",
  "role": "user",
  "profile": { "bio": "Hello", "timezone": "America/Toronto" },
  "preferences": { "theme": "system" },
  "emailVerifiedAt": null,
  "createdAt": "2025-09-22T00:00:00.000Z",
  "updatedAt": "2025-09-22T00:00:00.000Z"
}
```

---

## 2. `authTokens` (optional)

For password reset / email verification flows.

**Fields**
| Field      | Type     | Notes |
|------------|----------|-------|
| `_id`      | `ObjectId` | PK |
| `userId`   | `ObjectId` | Reference to `users._id` |
| `kind`     | `"email_verify" \| "password_reset"` | Token type |
| `tokenHash`| `string`   | Hash of emailed token |
| `expiresAt`| `Date`     | Auto-expire (TTL index) |
| `createdAt`| `Date`     | Issued at |
| `consumedAt`| `Date \| null` | When used |

**Indexes**
- `tokenHash` unique  
- `{ expiresAt: 1 }` TTL  
- `{ userId: 1, kind: 1 }`

---

## 3. `accounts` (optional, OAuth providers)

Links external accounts (Google, GitHub, etc.) to users.

**Fields**
| Field               | Type        | Notes |
|---------------------|-------------|-------|
| `_id`               | `ObjectId`  | PK |
| `userId`            | `ObjectId`  | Reference to `users` |
| `provider`          | `string`    | e.g., `"github"` |
| `providerAccountId` | `string`    | Provider’s user ID |
| `type`              | `"oauth" \| "email" \| "credentials"` | Account type |
| `access_token`      | `string \| null` | Optional |
| `refresh_token`     | `string \| null` | Optional |
| `expires_at`        | `int \| long \| null` | Epoch timestamp |

**Indexes**
- `{ provider: 1, providerAccountId: 1 }` unique  
- `{ userId: 1 }`

---

## 4. `rooms`

A collaborative story room.

**Fields**
| Field       | Type       | Notes |
|-------------|------------|-------|
| `_id`       | `ObjectId` | PK |
| `ownerId`   | `ObjectId` | Reference to `users` |
| `title`     | `string`   | Room name |
| `slug`      | `string \| null` | Optional human-readable id |
| `visibility`| `"private" \| "unlisted" \| "public"` | Sharing level |
| `createdAt` | `Date`     | Created |
| `updatedAt` | `Date`     | Last update |

**Indexes**
- `{ ownerId: 1, createdAt: -1 }`
- `slug` unique (if used)

---

## 5. `roomMembers`

Memberships for users in rooms.

**Fields**
| Field     | Type       | Notes |
|-----------|------------|-------|
| `_id`     | `ObjectId` | PK |
| `roomId`  | `ObjectId` | Ref to `rooms` |
| `userId`  | `ObjectId` | Ref to `users` |
| `role`    | `"owner" \| "editor" \| "viewer"` | Access role |
| `joinedAt`| `Date`     | Joined timestamp |

**Indexes**
- `{ roomId: 1, userId: 1 }` unique  
- `{ userId: 1, role: 1 }`

---

## 6. `nodes`

Story nodes within a room.

**Fields**
| Field       | Type       | Notes |
|-------------|------------|-------|
| `_id`       | `ObjectId` | PK |
| `roomId`    | `ObjectId` | Ref to `rooms` |
| `title`     | `string`   | Node title |
| `content`   | `object`   | `{ text, media }` freeform |
| `position`  | `object`   | `{ x: number, y: number }` for UI |
| `labels`    | `string[] \| null` | Tags |
| `createdBy` | `ObjectId` | Ref to `users` |
| `createdAt` | `Date`     | Created |
| `updatedAt` | `Date`     | Updated |

**Indexes**
- `{ roomId: 1, createdAt: -1 }`  
- `{ roomId: 1, title: 1 }`

---

## 7. `edges`

Connections between nodes.

**Fields**
| Field       | Type       | Notes |
|-------------|------------|-------|
| `_id`       | `ObjectId` | PK |
| `roomId`    | `ObjectId` | Ref to `rooms` |
| `fromNodeId`| `ObjectId` | Source node |
| `toNodeId`  | `ObjectId` | Destination node |
| `type`      | `"normal" \| "choice" \| "alt"` | Edge type |
| `label`     | `string \| null` | Edge label |
| `createdAt` | `Date`     | Created |

**Indexes**
- `{ roomId: 1, fromNodeId: 1, toNodeId: 1 }` unique  
- `{ roomId: 1, toNodeId: 1 }`

---

## 🔑 Reference rules

- **Use ObjectId references**, not DBRefs.  
- `userId` in other collections → `users._id`  
- `roomId` in nodes/edges/members → `rooms._id`  
- `fromNodeId`, `toNodeId` in edges → `nodes._id`

---

## 🚀 Sample workflow

1. **User signs up** → `users` doc inserted with bcrypt `passwordHash`.  
2. **Create room** → `rooms` doc + `roomMembers` doc (`role: owner`).  
3. **Add node** → insert in `nodes` with `roomId` + `createdBy`.  
4. **Link nodes** → insert in `edges` with `roomId`, `fromNodeId`, `toNodeId`.  

---

## 🛠️ Evolution strategy

- Validators are **moderate** + `additionalProperties: true` → you can add new fields without breaking.  
- To enforce new required fields:  
  1. Backfill existing docs.  
  2. Update collection validator via `collMod`.  
- Keep all **index changes** scripted and checked into `/scripts/migrations/`.  
