# Database Documentation 

## Overview
- Users' closets are now unique to them 
- Changes were made to the `app-backend/prisma/schema.prisma 
- Users need to be authenticated if they attempt to make a action which requires their ID (e.g., seeing their outfit of the day or uploading images), therefore the `auth.middleware.ts` needed to be used for such pages (`closetApi.ts`, and `AddPage.tsx`). 
- Example of change for `AddPage.tsx` below:

From:
```ts
const response = await fetch("http://localhost:5001/api/closet/upload", {
  method: "POST",
  body: formData,
});
```
To:
```ts
// get the JWT token
const token = localStorage.getItem('token');

const response = await fetch("http://localhost:5001/api/closet/upload", {
  method: "POST",
  body: formData,
  headers: {
    Authorization: `Bearer ${token}`,
    // DO NOT manually set 'Content-Type' when using FormData! Browser sets the correct boundary.
  },
});
```

- Prisma migrations were made to account for the new `schema.prisma` configuration