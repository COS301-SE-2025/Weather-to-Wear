## Making changes to a database:
docker-compose up -d
docker-compose exec backend npx prisma migrate dev --name switch_to_filename

## If the commands above give you an error, then remove any entries (for now we can do this)
docker-compose up -d
docker-compose exec backend npx prisma migrate reset --force
docker-compose exec backend npx prisma migrate dev --name switch_to_filename

