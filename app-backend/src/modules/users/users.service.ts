import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export default {
  setProfilePhoto: (id: string, profilePhoto: string) =>
    prisma.user.update({ where: { id }, data: { profilePhoto } }),

  getById: (id: string) =>
    prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, profilePhoto: true, location: true, isPrivate: true },
    }),

  setPrivacy: (id: string, isPrivate: boolean) =>
    prisma.user.update({ where: { id }, data: { isPrivate } }),
};
