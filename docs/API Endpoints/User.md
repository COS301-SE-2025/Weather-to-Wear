
## **Authentication API Endpoints**

> **General:**
> - All endpoints except `signup` and `login` require a valid JWT in the `Authorization: Bearer <token>` header.
> - User-specific actions use the authenticated user’s ID (from JWT or route params).
> - Endpoints marked with 🟡 are **not yet implemented** but recommended for future work.

---
### **1. Signup**
- **POST** `/api/auth/signup`  
    **Status:** 🟢 Implemented
    - **Body:**
        ```json
        { "name": "John Doe", "email": "john@example.com", "password": "SecurePassword123!" }
        ```
    - **Validation:**
        - All fields required.
        - Password must be ≥ 8 chars, with uppercase, lowercase, and special character.
    - **Response:**
        ```json
        {
          "message": "User registered successfully",
          "token": "<jwt_token>",
          "user": { "id": "<user_id>", "name": "John Doe", "email": "john@example.com" }
        }
        ```
    - **Error:**
        - `400 Bad Request` for missing fields, weak password, or email already exists.

---
### **2. Login**
- **POST** `/api/auth/login`  
    **Status:** 🟢 Implemented
    - **Body:**
        ```json
        { "email": "john@example.com", "password": "SecurePassword123!" }
        ```
    - **Response:**
        ```json
        {
          "message": "Login successful",
          "token": "<jwt_token>",
          "user": { "id": "<user_id>", "name": "John Doe", "email": "john@example.com" }
        }
        ``` 
    - **Error:**
        - `401 Unauthorized` if credentials are invalid or missing.

---
### **3. Get My Profile**
- **GET** `/api/auth/profile`  
    **Status:** 🟢 Implemented
    - **Headers:**
        - `Authorization: Bearer <token>`
    - **Response:**
        ```json
        {
          "message": "You are authenticated!",
          "user": { "id": "<user_id>", "email": "john@example.com" }
        }
        ```
    - **Notes:**
        - Returns user object from decoded JWT.
        - If you want more user fields, update backend logic accordingly.

---
### **4. Delete User**
- **DELETE** `/api/auth/users/:id`  
    **Status:** 🟢 Implemented
    - **Headers:**
        - `Authorization: Bearer <token>`
    - **Params:**
        - `id`: User ID to delete.
    - **Response:**
        ```json
        {
          "message": "User deleted successfully",
          "user": { "id": "<deleted_user_id>", "name": "John Doe", "email": "john@example.com" }
        }
        ```
    - **Error:**
        - `400 Bad Request` if `id` is missing or not found.
    - **Note:**
        - Any authenticated user can delete any user (needs improvement: restrict to self or admins).

---
### **5. Get User by ID** 🟡
- **GET** `/api/auth/users/:id`  
    **Status:** 🟡 _Not yet implemented_
    - **Purpose:** Get any user's profile by their ID (may be restricted or admin-only).
    - **Recommended Response:**
        ```json
        { "id": "<user_id>", "name": "John Doe", "email": "john@example.com" }
        ```

---
### **6. Update User Profile** 🟡
- **PUT** `/api/auth/users/:id`  
    **Status:** 🟡 _Not yet implemented_
    - **Purpose:** Edit user's own profile (name, email).
    - **Body:**
        ```json
        { "name": "New Name", "email": "newemail@example.com" }
        ```
    - **Recommended Response:**
        ```json
        {
          "message": "User updated successfully",
          "user": { "id": "<user_id>", "name": "New Name", "email": "newemail@example.com" }
        }
        ```

---
### **7. Change Password** 🟡
- **PUT** `/api/auth/users/:id/password`  
    **Status:** 🟡 _Not yet implemented_
    - **Purpose:** Change password (user must supply old and new password).
    - **Body:**
        ```json
        { "oldPassword": "Old123!", "newPassword": "NewStrongPassword123!" }
        ```
    - **Recommended Response:**
        ```json
        { "message": "Password updated successfully" }
        ```
    - **Validation:**
        - Require both fields, check old password, enforce password rules.

---
### **8. Logout** 🟡
- **POST** `/api/auth/logout`  
    **Status:** 🟡 _Not yet implemented_ (optional, for blacklisting tokens, not needed for stateless JWT)
---
## **Summary Table**

| Method | Endpoint                       | Auth | Status         | Purpose                              |
| ------ | ------------------------------ | ---- | -------------- | ------------------------------------ |
| POST   | `/api/auth/signup`             | No   | 🟢 Implemented | Register new user                    |
| POST   | `/api/auth/login`              | No   | 🟢 Implemented | Login and get JWT                    |
| GET    | `/api/auth/profile`            | Yes  | 🟢 Implemented | Get current user's info (from token) |
| DELETE | `/api/auth/users/:id`          | Yes  | 🟢 Implemented | Delete user by ID                    |
| GET    | `/api/auth/users/:id`          | Yes  | 🟡 Not yet     | Get user by ID                       |
| PUT    | `/api/auth/users/:id`          | Yes  | 🟡 Not yet     | Edit user profile                    |
| PUT    | `/api/auth/users/:id/password` | Yes  | 🟡 Not yet     | Change user password                 |
| POST   | `/api/auth/logout`             | Yes  | 🟡 Not yet     | (Optional) Invalidate JWT/logout     |

---
### **General Error Handling**
- `400 Bad Request`: Missing or invalid fields.
- `401 Unauthorized`: Invalid or missing token/credentials.
- `403 Forbidden`: Not allowed to perform the action (authorization needed).
- All responses: `application/json`.

---
### **Password Rules**
- At least 8 characters.
- At least one lowercase, one uppercase, and one special character.

---
### **To Be Implemented:**
- Edit user profile, change password, get user by ID, and (optionally) logout.
- Restrict deletion so only a user can delete themselves (not others).
---


