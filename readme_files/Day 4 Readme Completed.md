# Disaster Simulation & Intelligent Relief Allocation System

## Day 4 --- Complete Handoff for the Next ChatGPT Conversation

### Purpose

This README is the complete handoff for continuing the project in a
fresh ChatGPT conversation.

**Goal:** finish Day 4 without recreating, conflicting with, or undoing
completed work.

The next ChatGPT must **first inspect and verify the actual current
code**, compare it with this README, and only then continue with **Part
10 --- User Roles / Role-Based Authorization**.

The actual code is the source of truth. If this README and the code
differ, inspect the code, explain the mismatch, and preserve working
code.

------------------------------------------------------------------------

# 1. Project Overview

**Project:** Disaster Simulation & Intelligent Relief Allocation System

The system is a disaster-management decision-support backend.

Overall intended flow:

``` text
Create Disaster
      ↓
Simulate Disaster
      ↓
Identify Affected Population / Area
      ↓
Assess Impact
      ↓
Estimate Relief Requirements
      ↓
Find Suitable Shelters
      ↓
Find Safe / Optimal Routes
      ↓
Intelligently Allocate Relief Resources
      ↓
Generate Reports
```

The backend is being developed first. The frontend will be developed
later.

------------------------------------------------------------------------

# 2. Technology Stack

Backend:

``` text
Python
FastAPI
SQLAlchemy
PostgreSQL
PostGIS
Pydantic
JWT authentication
PyJWT
pwdlib + Argon2
Docker / Docker Compose
NetworkX
ReportLab
Swagger / OpenAPI
Git / GitHub
```

Future frontend:

``` text
Next.js
React
TypeScript
Tailwind CSS
Leaflet / React-Leaflet
```

------------------------------------------------------------------------

# 3. Project Roadmap

``` text
Day 1 — FastAPI project setup                         COMPLETE
Day 2 — PostgreSQL/PostGIS + SQLAlchemy               COMPLETE
Day 3 — Models + Schemas + CRUD APIs                  COMPLETE
Day 4 — Authentication + JWT + User Roles             CURRENT
Day 5 — Disaster + population + basic simulation
Day 6 — Relief requirement calculation
Day 7 — Shelters + warehouses + resources
Day 8 — Basic relief allocation
Day 9 — Reports + API integration
Day 10 — Testing + bug fixing + cleanup + docs
```

Do not start later-day or future-phase work while finishing Day 4.

------------------------------------------------------------------------

# 4. Day 1 --- Completed

Completed:

-   FastAPI project and server.
-   Root endpoint.
-   Health endpoint.
-   Swagger/OpenAPI.

Swagger:

``` text
http://127.0.0.1:8000/docs
```

Endpoints:

``` text
GET /
GET /health
```

------------------------------------------------------------------------

# 5. Day 2 --- Completed

Completed:

-   PostgreSQL 16 in Docker.
-   PostGIS 3.4.
-   Database:

``` text
disaster_relief
```

-   Container:

``` text
disaster_relief_db
```

-   SQLAlchemy 2.x.
-   psycopg.
-   `.env`.
-   SQLAlchemy engine.
-   `Base`.
-   `SessionLocal`.
-   `get_db()`.
-   Database health check.

Database entities:

``` text
users
disasters
population_points
shelters
warehouses
resources
simulation_results
relief_requirements
```

Useful commands:

``` bash
docker compose up -d
docker compose ps
```

------------------------------------------------------------------------

# 6. Day 3 --- Completed

Day 3 is complete.

Completed:

-   SQLAlchemy models.
-   Pydantic schemas.
-   CRUD APIs.
-   Basic disaster simulation.
-   Basic relief estimation.
-   Swagger testing.
-   PostgreSQL persistence testing.

Routes currently live in:

``` text
app/main.py
```

There is currently **no routers directory**.

Do not restructure the application unnecessarily.

------------------------------------------------------------------------

# 7. Current Project Structure

Expected structure:

``` text
Backend/
│
├── app/
│   ├── __init__.py
│   ├── database.py
│   ├── main.py
│   ├── schemas.py
│   ├── security.py
│   │
│   └── models/
│       ├── __init__.py
│       ├── disaster.py
│       ├── population.py
│       ├── relief.py
│       ├── resource.py
│       ├── shelter.py
│       ├── simulation.py
│       ├── user.py
│       └── warehouse.py
│
├── venv/
├── .env
├── docker-compose.yml
└── requirements.txt
```

The actual tree must be inspected before modifying anything.

------------------------------------------------------------------------

# 8. Current User Model

`app/models/user.py` currently has these important fields:

``` text
id
username
email
phone_number
password_hash
role
created_at
```

The role field is already present:

``` python
role: Mapped[str] = mapped_column(
    String(50),
    nullable=False,
    default="coordinator"
)
```

Current default role:

``` text
coordinator
```

**Do not create another User model or another role field.**

Part 10 must build on the existing role field.

------------------------------------------------------------------------

# 9. Current Authentication --- Part 8 Complete

Day 4 authentication has already been implemented.

## Password hashing

The project uses:

``` text
pwdlib[argon2]
```

Current dependency:

``` text
pwdlib[argon2]==0.3.1
```

`app/security.py` has:

``` python
from pwdlib import PasswordHash

password_hash = PasswordHash.recommended()

def hash_password(password: str) -> str:
    return password_hash.hash(password)

def verify_password(password: str, hashed_password: str) -> bool:
    return password_hash.verify(password, hashed_password)
```

Password hashing was tested successfully.

------------------------------------------------------------------------

# 10. JWT Configuration

`.env` contains the JWT configuration in this form:

``` text
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/disaster_relief

JWT_SECRET_KEY=your-very-long-random-secret-key-here-at-least-32-characters
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
```

The actual secret must remain private.

JWT settings:

``` text
Algorithm: HS256
Expiration: 30 minutes
```

Do not hard-code the secret.

------------------------------------------------------------------------

# 11. JWT Creation

`create_access_token()` is already implemented.

Conceptually:

``` python
def create_access_token(data: dict) -> str:
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({"exp": expire})

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
```

The token payload contains:

``` text
sub = user ID
exp = expiration timestamp
```

Example:

``` json
{
  "sub": "2",
  "exp": 1790062795
}
```

------------------------------------------------------------------------

# 12. JWT Decoding --- Part 8

`decode_access_token()` was added to `app/security.py`.

It:

-   decodes the JWT;
-   verifies the signature;
-   checks expiration;
-   requires an `exp` claim;
-   returns 401 for expired tokens;
-   returns 401 for invalid tokens.

Conceptually:

``` python
def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        if "exp" not in payload:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has no expiration"
            )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token"
        )
```

------------------------------------------------------------------------

# 13. Current User Dependency --- Part 8

The project uses `HTTPBearer`.

Current pattern:

``` python
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:

    token = credentials.credentials
    payload = decode_access_token(token)

    user_id = payload.get("sub")

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=401,
            detail="Invalid token"
        )

    user = db.query(User).filter(
        User.id == user_id
    ).first()

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user
```

Flow:

``` text
Authorization: Bearer <JWT>
        ↓
HTTPBearer
        ↓
get_current_user()
        ↓
decode_access_token()
        ↓
extract sub
        ↓
find User in PostgreSQL
        ↓
return User
```

**Reuse this dependency. Do not create another authentication system.**

------------------------------------------------------------------------

# 14. Registration and Login

## Registration

``` text
POST /users
```

This remains public.

The password is stored using:

``` python
password_hash=hash_password(user.password)
```

Do **not** add:

``` python
current_user: User = Depends(get_current_user)
```

to registration.

## Login

``` text
POST /login
```

This also remains public.

Flow:

``` text
email
 ↓
find user
 ↓
verify password
 ↓
create JWT
 ↓
return token
```

Response:

``` json
{
  "access_token": "eyJ...",
  "token_type": "bearer"
}
```

Do not protect `/login` with `get_current_user()`.

------------------------------------------------------------------------

# 15. Current Authentication Schemas

`app/schemas.py` includes:

``` python
class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
```

Existing user schemas include `UserCreate` and `UserUpdate`.

Before changing schemas, inspect the actual file.

------------------------------------------------------------------------

# 16. Part 9 --- Protected APIs COMPLETE

Part 9 reused:

``` python
current_user: User = Depends(get_current_user)
```

on existing APIs.

The existing business/database logic was left unchanged.

## Public endpoints

``` text
GET  /
GET  /health
POST /users
POST /login
```

## Protected endpoints

### Disasters

``` text
POST   /disasters
GET    /disasters
GET    /disasters/{disaster_id}
PUT    /disasters/{disaster_id}
DELETE /disasters/{disaster_id}
```

### Warehouses

``` text
POST   /warehouses
GET    /warehouses
GET    /warehouses/{warehouse_id}
PUT    /warehouses/{warehouse_id}
DELETE /warehouses/{warehouse_id}
```

### Resources

``` text
POST   /resources
GET    /resources
GET    /resources/{resource_id}
PUT    /resources/{resource_id}
DELETE /resources/{resource_id}
```

### Population

``` text
POST /population
GET  /population
```

### User management

``` text
GET    /users
GET    /users/{user_id}
PUT    /users/{user_id}
DELETE /users/{user_id}
```

Registration stays public:

``` text
POST /users
```

### Simulation

``` text
POST /simulation/run
GET  /simulation/{disaster_id}
```

### Shelters

``` text
POST   /shelters
GET    /shelters
GET    /shelters/{shelter_id}
PUT    /shelters/{shelter_id}
DELETE /shelters/{shelter_id}
```

### Relief

``` text
POST /relief/estimate/{disaster_id}
GET  /relief/{disaster_id}
```

------------------------------------------------------------------------

# 17. `/test-auth`

Already protected:

``` python
@app.get("/test-auth")
def test_auth(current_user: User = Depends(get_current_user)):
    return {
        "message": "Authentication successful",
        "user_id": current_user.id,
        "username": current_user.username,
        "email": current_user.email
    }
```

Do not add another authentication dependency.

------------------------------------------------------------------------

# 18. Swagger

Swagger:

``` text
http://127.0.0.1:8000/docs
```

Authentication flow:

``` text
POST /users
      ↓
register

POST /login
      ↓
receive JWT

Authorize
      ↓
Bearer token

Protected API
      ↓
works
```

Without a valid JWT:

``` text
401 Unauthorized
```

With a valid JWT:

``` text
normal endpoint response
```

------------------------------------------------------------------------

# 19. 401 vs 403

This distinction matters for Part 10.

``` text
401 Unauthorized
```

means the request is not properly authenticated.

Examples:

``` text
missing token
invalid token
expired token
unknown user
```

``` text
403 Forbidden
```

means the user is authenticated but lacks permission for the requested
operation.

Part 10 should use this distinction correctly.

------------------------------------------------------------------------

# 20. Current Day 4 Status

Completed:

``` text
[x] User system inspection
[x] Authentication schemas
[x] Password hashing
[x] Secure registration
[x] Password verification
[x] Login endpoint
[x] JWT creation
[x] JWT expiration
[x] Current-user dependency
[x] Protected APIs
```

Remaining:

``` text
[ ] User roles
[ ] Role-based authorization
[ ] Complete Swagger authentication/authorization testing
[ ] Full Day 4 end-to-end verification
[ ] Final Day 4 documentation
```

------------------------------------------------------------------------

# 21. NEXT --- Part 10

Next task:

## User Roles / Role-Based Authorization

Authentication:

``` text
Who is the user?
```

Authorization:

``` text
What is the user allowed to do?
```

Current flow:

``` text
Request
   ↓
JWT
   ↓
get_current_user()
   ↓
User
```

Part 10 should extend it to:

``` text
Request
   ↓
JWT
   ↓
get_current_user()
   ↓
User
   ↓
Check role
   ↓
Allow / Reject
```

The existing `User.role` field should be reused.

------------------------------------------------------------------------

# 22. CRITICAL: What the Next ChatGPT Must Do First

**Do not immediately implement Part 10.**

First inspect the actual project.

Required sequence:

``` text
1. Inspect project structure
        ↓
2. Inspect app/main.py
        ↓
3. Inspect app/security.py
        ↓
4. Inspect app/models/user.py
        ↓
5. Inspect app/schemas.py
        ↓
6. Inspect requirements.txt
        ↓
7. Inspect .env configuration
        ↓
8. Verify current authentication code
        ↓
9. Verify Part 9 protected endpoints
        ↓
10. Run/test backend if necessary
        ↓
11. Compare actual code with this README
        ↓
12. Identify any mismatch
        ↓
13. Explain the current state
        ↓
14. Only then begin Part 10
```

The actual code is the source of truth.

If there is a mismatch:

-   do not overwrite working code;
-   do not duplicate functions;
-   do not duplicate authentication;
-   do not create another User model;
-   do not restructure unnecessarily;
-   explain the mismatch;
-   make only the required change.

------------------------------------------------------------------------

# 23. Part 10 Development Style

Continue incrementally:

``` text
Inspect
   ↓
Explain
   ↓
Identify file
   ↓
Make one change
   ↓
Run server
   ↓
Test
   ↓
Confirm
   ↓
Continue
```

Do not dump the entire implementation at once.

------------------------------------------------------------------------

# 24. Part 10 Role Design

Before changing code:

1.  Inspect the current `User.role`.
2.  Inspect existing user data/roles if relevant.
3.  Check project requirements.
4.  Decide the minimum role structure needed.
5.  Reuse the existing role field.

Current default:

``` text
coordinator
```

Do not automatically introduce a complicated permission system.

Do not change the database schema unless necessary.

Prefer a reusable FastAPI dependency for role checks instead of
duplicating role checks in every endpoint.

Conceptually:

``` text
get_current_user()
        ↓
Authenticated User
        ↓
Role checker
        ↓
Required role?
     ↙       ↘
   YES        NO
    ↓          ↓
 Allow       403
```

------------------------------------------------------------------------

# 25. Part 10 Testing

Test all three cases:

### Valid authenticated user with required role

``` text
JWT
 ↓
User
 ↓
Required role
 ↓
Allowed
```

### Authenticated user with insufficient role

``` text
JWT
 ↓
User
 ↓
Wrong role
 ↓
403 Forbidden
```

### Missing/invalid JWT

``` text
No valid identity
 ↓
401 Unauthorized
```

------------------------------------------------------------------------

# 26. Official Documentation Rule

Before implementing Part 10, consult official documentation relevant to:

``` text
FastAPI dependency injection
FastAPI security/authentication
Pydantic
SQLAlchemy
PyJWT
```

Use official documentation to verify current APIs and recommended usage.

Then implement using the existing project's style.

------------------------------------------------------------------------

# 27. Day 4 Final Completion Target

Eventually:

``` text
[x] User registration works
[x] Passwords are hashed
[x] Password verification works
[x] Login works
[x] JWT is generated
[x] JWT has expiration
[x] Invalid JWT is rejected
[x] Missing JWT is rejected
[x] current_user dependency works
[x] Protected APIs require authentication
[x] Valid JWT allows protected APIs

[ ] User roles work
[ ] Role-based authorization works
[ ] Insufficient roles receive 403
[ ] Swagger demonstrates authentication
[ ] Swagger demonstrates authorization
[ ] Existing Day 1–3 functionality still works
[ ] Complete Day 4 flow verified
```

------------------------------------------------------------------------

# 28. Do Not Start Later Work

Do not start:

``` text
❌ Advanced GIS
❌ PostGIS spatial algorithms
❌ OpenStreetMap
❌ Dijkstra / A*
❌ AI / ML
❌ Optimization
❌ Frontend
❌ Weather API
❌ Advanced disaster simulation
❌ Advanced routing
```

The immediate goal is:

``` text
FINISH DAY 4
```

------------------------------------------------------------------------

# 29. Day 4 End-to-End Target

``` text
                    USER
                     │
                     ↓
                 REGISTER
                     │
                     ↓
              Password hashed
                     │
                     ↓
               PostgreSQL
                     │
                     ↓
                   LOGIN
                     │
                     ↓
                 JWT TOKEN
                     │
                     ↓
               Authorization
                     │
                     ↓
             get_current_user()
                     │
                     ↓
              Authenticated User
                     │
                     ↓
                Check Role
                     │
              ┌──────┴──────┐
              ↓             ↓
           Allowed        Denied
              ↓             ↓
          Endpoint         403
```

------------------------------------------------------------------------

# 30. Copy This to the Next ChatGPT Conversation

Use the following as the opening instruction:

> I am continuing the **Disaster Simulation & Intelligent Relief
> Allocation System**.
>
> Days 1--3 are complete. Day 4 authentication work through Part 9 is
> complete. I now need to finish Day 4.
>
> I have provided a complete handoff README.
>
> **Do not immediately implement Part 10.**
>
> First inspect my actual current project and verify:
>
> -   project structure
> -   `app/main.py`
> -   `app/security.py`
> -   `app/models/user.py`
> -   `app/schemas.py`
> -   `requirements.txt`
> -   `.env`
> -   current authentication implementation
> -   current protected endpoints
> -   existing `role` field
>
> Verify that Part 8 and Part 9 are actually implemented as described.
>
> Compare the actual code with the README.
>
> If anything differs, explain the difference before changing anything.
>
> The actual code is the source of truth.
>
> Do not:
>
> -   recreate completed work;
> -   create duplicate authentication systems;
> -   create another User model;
> -   create another role field;
> -   remove working Part 9 protection;
> -   restructure the project unnecessarily.
>
> Once the current implementation is verified, continue with:
>
> **Part 10 --- User Roles / Role-Based Authorization**
>
> Work incrementally:
>
> ``` text
> Inspect
> ↓
> Explain
> ↓
> Implement one change
> ↓
> Test
> ↓
> Confirm
> ↓
> Continue
> ```
>
> The goal is to **finish Day 4**, not to begin later project phases.
