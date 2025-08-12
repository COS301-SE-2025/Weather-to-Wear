// src/modules/users/users.service.ts
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default {
  setProfilePhoto: (id: string, profilePhoto: string) =>
    prisma.user.update({ where: { id }, data: { profilePhoto } }),
};
