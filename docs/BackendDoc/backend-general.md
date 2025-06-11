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



