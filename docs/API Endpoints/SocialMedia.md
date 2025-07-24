# Social Media API Endpoints

> **General:**
> - All endpoints require a valid JWT in the `Authorization: Bearer <token>` header, except for public post retrieval (`GET /api/social/posts`).
> - User-specific actions use the authenticated user’s ID (from JWT or route params).
> - Endpoints marked with 🟡 are **not yet implemented** but recommended for future work.
> - Base URL: `/api/social`

---

## 1. Create Post
- **POST** `/api/social/posts`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Body:**
    ```json
    {
      "imageUrl": "https://example.com/image.jpg",
      "location": "New York",
      "caption": "Loving this outfit for sunny days!",
      "weather": { "condition": "sunny" }
    }
    ```
  - **Validation:**
    - All fields are optional, but at least one of `imageUrl`, `location`, `caption`, or `weather` is recommended.
    - `imageUrl` must be a valid URL if provided.
    - `weather.condition` must be a valid weather type (e.g., "sunny", "rainy", "cloudy") if provided.
  - **Recommended Response:**
    ```json
    {
      "message": "Post created successfully",
      "post": {
        "id": "<post_id>",
        "userId": "<user_id>",
        "imageUrl": "https://example.com/image.jpg",
        "location": "New York",
        "caption": "Loving this outfit for sunny days!",
        "weather": { "condition": "sunny" },
        "createdAt": "2025-07-14T16:03:00Z"
      }
    }
    ```
  - **Error:**
    - `400 Bad Request` for invalid `imageUrl` or malformed `weather` JSON.
    - `401 Unauthorized` if token is missing or invalid.

---

## 2. Get Posts (Feed)
- **GET** `/api/social/posts`  
  **Status:** 🟡 _Not yet implemented_
  - **Query Parameters:**
    - `userId`: Filter by user (optional).
    - `limit`: Number of posts to return (default: 20).
    - `offset`: Skip posts for pagination (default: 0).
    - `include`: Comma-separated relations, e.g., `comments,likes,user`.
  - **Recommended Response:**
    ```json
    {
      "message": "Posts retrieved successfully",
      "posts": [
        {
          "id": "<post_id>",
          "userId": "<user_id>",
          "imageUrl": "https://example.com/image.jpg",
          "location": "New York",
          "caption": "Loving this outfit!",
          "weather": { "condition": "sunny" },
          "createdAt": "2025-07-14T16:03:00Z",
          "user": { "id": "<user_id>", "name": "John Doe" }
        }
      ]
    }
    ```
  - **Error:**
    - `400 Bad Request` for invalid query parameters.

---

## 3. Get Post by ID
- **GET** `/api/social/posts/:id`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>` (optional for public posts)
  - **Params:**
    - `id`: Post ID.
  - **Query Parameters:**
    - `include`: Comma-separated relations, e.g., `comments,likes,user`.
  - **Recommended Response:**
    ```json
    {
      "message": "Post retrieved successfully",
      "post": {
        "id": "<post_id>",
        "userId": "<user_id>",
        "imageUrl": "https://example.com/image.jpg",
        "location": "New York",
        "caption": "Loving this outfit!",
        "weather": { "condition": "sunny" },
        "createdAt": "2025-07-14T16:03:00Z"
      }
    }
    ```
  - **Error:**
    - `404 Not Found` if post ID doesn’t exist.

---

## 4. Update Post
- **PUT** `/api/social/posts/:id`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `id`: Post ID.
  - **Body:**
    ```json
    {
      "imageUrl": "https://example.com/new-image.jpg",
      "location": "Los Angeles",
      "caption": "Updated caption!",
      "weather": { "condition": "cloudy" }
    }
    ```
  - **Validation:**
    - All fields optional, but at least one field should be provided.
    - User must own the post.
  - **Recommended Response:**
    ```json
    {
      "message": "Post updated successfully",
      "post": {
        "id": "<post_id>",
        "imageUrl": "https://example.com/new-image.jpg",
        "location": "Los Angeles",
        "caption": "Updated caption!",
        "weather": { "condition": "cloudy" }
      }
    }
    ```
  - **Error:**
    - `403 Forbidden` if user doesn’t own the post.
    - `404 Not Found` if post ID doesn’t exist.

---

## 5. Delete Post
- **DELETE** `/api/social/posts/:id`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `id`: Post ID.
  - **Recommended Response:**
    ```json
    { "message": "Post deleted successfully" }
    ```
  - **Error:**
    - `403 Forbidden` if user doesn’t own the post.
    - `404 Not Found` if post ID doesn’t exist.

---

## 6. Add Comment
- **POST** `/api/social/posts/:postId/comments`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `postId`: Post ID.
  - **Body:**
    ```json
    { "content": "Great outfit!" }
    ```
  - **Validation:**
    - `content` is required and must be non-empty.
  - **Recommended Response:**
    ```json
    {
      "message": "Comment added successfully",
      "comment": {
        "id": "<comment_id>",
        "postId": "<post_id>",
        "userId": "<user_id>",
        "content": "Great outfit!",
        "createdAt": "2025-07-14T16:03:00Z"
      }
    }
    ```
  - **Error:**
    - `400 Bad Request` if `content` is missing.
    - `404 Not Found` if `postId` doesn’t exist.

---

## 7. Get Comments for Post
- **GET** `/api/social/posts/:postId/comments`  
  **Status:** 🟡 _Not yet implemented_
  - **Params:**
    - `postId`: Post ID.
  - **Query Parameters:**
    - `limit`: Number of comments to return (default: 20).
    - `offset`: Skip comments for pagination (default: 0).
    - `include`: Comma-separated relations, e.g., `user`.
  - **Recommended Response:**
    ```json
    {
      "message": "Comments retrieved successfully",
      "comments": [
        {
          "id": "<comment_id>",
          "postId": "<post_id>",
          "userId": "<user_id>",
          "content": "Great outfit!",
          "createdAt": "2025-07-14T16:03:00Z",
          "user": { "id": "<user_id>", "name": "John Doe" }
        }
      ]
    }
    ```
  - **Error:**
    - `404 Not Found` if `postId` doesn’t exist.

---

## 8. Update Comment
- **PUT** `/api/social/comments/:id`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `id`: Comment ID.
  - **Body:**
    ```json
    { "content": "Updated comment!" }
    ```
  - **Validation:**
    - `content` is required.
    - User must own the comment.
  - **Recommended Response:**
    ```json
    {
      "message": "Comment updated successfully",
      "comment": {
        "id": "<comment_id>",
        "content": "Updated comment!"
      }
    }
    ```
  - **Error:**
    - `403 Forbidden` if user doesn’t own the comment.
    - `404 Not Found` if comment ID doesn’t exist.

---

## 9. Delete Comment
- **DELETE** `/api/social/comments/:id`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `id`: Comment ID.
  - **Recommended Response:**
    ```json
    { "message": "Comment deleted successfully" }
    ```
  - **Error:**
    - `403 Forbidden` if user doesn’t own the comment.
    - `404 Not Found` if comment ID doesn’t exist.

---

## 10. Like Post
- **POST** `/api/social/posts/:postId/likes`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `postId`: Post ID.
  - **Recommended Response:**
    ```json
    {
      "message": "Post liked successfully",
      "like": {
        "id": "<like_id>",
        "postId": "<post_id>",
        "userId": "<user_id>",
        "createdAt": "2025-07-14T16:03:00Z"
      }
    }
    ```
  - **Error:**
    - `400 Bad Request` if user already liked the post.
    - `404 Not Found` if `postId` doesn’t exist.

---

## 11. Unlike Post
- **DELETE** `/api/social/posts/:postId/likes`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `postId`: Post ID.
  - **Recommended Response:**
    ```json
    { "message": "Post unliked successfully" }
    ```
  - **Error:**
    - `404 Not Found` if `postId` or like doesn’t exist.

---

## 12. Get Likes for Post
- **GET** `/api/social/posts/:postId/likes`  
  **Status:** 🟡 _Not yet implemented_
  - **Params:**
    - `postId`: Post ID.
  - **Query Parameters:**
    - `limit`: Number of likes to return (default: 20).
    - `offset`: Skip likes for pagination (default: 0).
    - `include`: Comma-separated relations, e.g., `user`.
  - **Recommended Response:**
    ```json
    {
      "message": "Likes retrieved successfully",
      "likes": [
        {
          "id": "<like_id>",
          "postId": "<post_id>",
          "userId": "<user_id>",
          "createdAt": "2025-07-14T16:03:00Z",
          "user": { "id": "<user_id>", "name": "John Doe" }
        }
      ]
    }
    ```
  - **Error:**
    - `404 Not Found` if `postId` doesn’t exist.

---

## 13. Follow User
- **POST** `/api/social/users/:userId/follow`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `userId`: ID of user to follow.
  - **Recommended Response:**
    ```json
    {
      "message": "User followed successfully",
      "follow": {
        "id": "<follow_id>",
        "followerId": "<auth_user_id>",
        "followingId": "<user_id>",
        "createdAt": "2025-07-14T16:03:00Z"
      }
    }
    ```
  - **Error:**
    - `400 Bad Request` if already following.
    - `404 Not Found` if `userId` doesn’t exist.

---

## 14. Unfollow User
- **DELETE** `/api/social/users/:userId/follow`  
  **Status:** 🟡 _Not yet implemented_
  - **Headers:**
    - `Authorization: Bearer <token>`
  - **Params:**
    - `userId`: ID of user to unfollow.
  - **Recommended Response:**
    ```json
    { "message": "User unfollowed successfully" }
    ```
  - **Error:**
    - `404 Not Found` if follow relationship doesn’t exist.

---

## 15. Get Followers
- **GET** `/api/social/users/:userId/followers`  
  **Status:** 🟡 _Not yet implemented_
  - **Params:**
    - `userId`: User ID.
  - **Query Parameters:**
    - `limit`: Number of followers (default: 20).
    - `offset`: Skip for pagination (default: 0).
  - **Recommended Response:**
    ```json
    {
      "message": "Followers retrieved successfully",
      "followers": [
        {
          "id": "<follow_id>",
          "followerId": "<follower_id>",
          "followingId": "<user_id>",
          "follower": { "id": "<follower_id>", "name": "Jane Doe" }
        }
      ]
    }
    ```
  - **Error:**
    - `404 Not Found` if `userId` doesn’t exist.

---

## 16. Get Following
- **GET** `/api/social/users/:userId/following`  
  **Status:** 🟡 _Not yet implemented_
  - **Params:**
    - `userId`: User ID.
  - **Query Parameters:**
    - `limit`: Number of followed users (default: 20).
    - `offset`: Skip for pagination (default: 0).
  - **Recommended Response:**
    ```json
    {
      "message": "Following users retrieved successfully",
      "following": [
        {
          "id": "<follow_id>",
          "followerId": "<user_id>",
          "followingId": "<followed_user_id>",
          "following": { "id": "<followed_user_id>", "name": "John Doe" }
        }
      ]
    }
    ```
  - **Error:**
    - `404 Not Found` if `userId` doesn’t exist.

---

## Summary Table

| Method | Endpoint                                | Auth | Status         | Purpose                              |
| ------ | --------------------------------------- | ---- | -------------- | ------------------------------------ |
| POST   | `/api/social/posts`                    | Yes  | 🟡 Not yet     | Create a post                        |
| GET    | `/api/social/posts`                    | No   | 🟡 Not yet     | Get posts (feed)                    |
| GET    | `/api/social/posts/:id`                | Optional | 🟡 Not yet     | Get post by ID                   |
| PUT    | `/api/social/posts/:id`                | Yes  | 🟡 Not yet     | Update post                          |
| DELETE | `/api/social/posts/:id`                | Yes  | 🟡 Not yet     | Delete post                          |
| POST   | `/api/social/posts/:postId/comments`   | Yes  | 🟡 Not yet     | Add comment to post                  |
| GET    | `/api/social/posts/:postId/comments`   | No   | 🟡 Not yet     | Get comments for post                |
| PUT    | `/api/social/comments/:id`             | Yes  | 🟡 Not yet     | Update comment                       |
| DELETE | `/api/social/comments/:id`             | Yes  | 🟡 Not yet     | Delete comment                       |
| POST   | `/api/social/posts/:postId/likes`      | Yes  | 🟡 Not yet     | Like a post                          |
| DELETE | `/api/social/posts/:postId/likes`      | Yes  | 🟡 Not yet     | Unlike a post                        |
| GET    | `/api/social/posts/:postId/likes`      | No   | 🟡 Not yet     | Get likes for post                   |
| POST   | `/api/social/users/:userId/follow`     | Yes  | 🟡 Not yet     | Follow a user                        |
| DELETE | `/api/social/users/:userId/follow`     | Yes  | 🟡 Not yet     | Unfollow a user                      |
| GET    | `/api/social/users/:userId/followers`  | No   | 🟡 Not yet     | Get user’s followers                 |
| GET    | `/api/social/users/:userId/following`  | No   | 🟡 Not yet     | Get users followed by user           |

---

## General Error Handling
- `400 Bad Request`: Missing or invalid fields, duplicate actions (e.g., liking twice).
- `401 Unauthorized`: Invalid or missing token.
- `403 Forbidden`: User lacks permission (e.g., editing another user’s post).
- `404 Not Found`: Resource not found (e.g., post, user, comment).
- All responses: `application/json`.

---

