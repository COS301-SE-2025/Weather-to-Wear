## **General Notes**
- All endpoints require authentication (`Authorization: Bearer <token>`).
- Dates/times are ISO 8601 (UTC or local timezone with offset).
- Responses are `application/json`.
- Validation errors should return HTTP 400 with descriptive error messages.
- 404 for not found resources, 401/403 for unauthorized.

---
## **Status Legend**
- 🟢 Implemented
- 🟡 Not yet implemented (proposed; to be built by your team)
