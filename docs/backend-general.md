# General Backend Information 

---

## Running the backend services:

| Action                              | Command(s)                                                                                                             | Note                                   |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| **Full clean & build**              | `docker-compose down -v` <br> `docker-compose up --build`                                                              | Wipes DB! Use for a clean slate        |
| **Start (already built)**           | `docker-compose up`                                                                                                    | Use after initial build                |
| **Start in background**             | `docker-compose up -d`                                                                                                 | Use for headless running               |
| **Stop everything**                 | `docker-compose down`                                                                                                  | Containers down, data kept             |
| **Code or schema change**           | `docker-compose exec backend npx prisma migrate dev --name ...` <br> `docker-compose exec backend npx prisma generate` | Only needed for schema/db code changes |
| **Rebuild after Dockerfile change** | `docker-compose up --build`                                                                                            | Only if deps/images changed            |


## Restarting the database
Note that the notorious tweaking of the web-app which occurred after `docker-compose down -v` has been fixed. Here's how:
- Added `- ./app-backend/prisma:/app/prisma` to docker-compose.yml 
- Changed apk line in Dockerfile to `RUN apk add --no-cache curl postgresql-client` -> not sure if this contributed to the fixing of the problem. 
- Deleted all **folders** (not the `.toml`) in the `app-backend/prisma/migrations/` 
- Ran the following in the terminal:
    - `docker-compose down -v` -> Delete the DB volume
    - `docker-compose up -d db` -> Start just the DB
    - Run migration dev to create ALL migrations from the current schema:
        - docker-compose run --rm backend sh
        - npx prisma migrate dev --name init
        - exit
    - `docker-compose down -v`
    - `docker-compose up --build` 
The migration folders should be regenerated and everything should be working. 

## Current Downfalls 
1. User has to sign up -> log out -> log in for things to work as expected
    - To fix, just redirect from sign up to login 
2. Database is not being hosted. Only locally persistent. 
