# Services Contract 

---

## Authentication System 
The authentication system provides the user with options to either create an account or login to an existing account. 
#### Sign Up 
The sign up endpoint allows users to create an account.
- Inputs: User's name, email, and password in JSON format. 
- Output: Creates that user and adds them in the database. Their password is hashed using bcrypt. 
- The landing page makes use of this endpoint. Once a user signs up, they are redirected to the dashboard and can start creating their wardrobe. 
#### Login 
The login endpoint allows users to log into their existing account. 
- Inputs: User's email and password. 
- Outputs: Logs the user in and starts their sessions with their JWT token. 
- The landing page makes use of this endpoint. Once a user logs in, they are redirected to the dashboard and can view their recommended outfits. 

## Weather API System 
The weather API system makes use of two weather API's. The primary API is `FreeWeatherAPI` while the fallback one is `OpenWeatherMap` for when the primary fails. 
- Inputs: The user's location is tracked via their IP address and sent as part of the URL to the API. If the user's location is unavailable or they want to manually change the city, this is also an option. 
- Outputs: A 6 hour forecast is returned for either the user's automatically detected location or manually entered location. 
- The dashboard and the outfit recommendation engine make use of the weather. The dashboard displays the forecast to the user, while the recommendation uses the temperature to generate outfits for the user. 

## Wardrobe Management (Adding a clothing item)
The wardrobe management currently only supports adding a user's clothing item to the database. Editing and deleting are still to be implemented. 
- Inputs: An image of the clothing item, along with a tags (such as type) 
- Outputs: The image along with the tags are stored in a database which represents the user's wardrobe.  
- The wardrobe management system is not only used by virtual closet, but is also vital for the recommendation engine to generate outfits.    

## Virtual Closet
The virtual closet is a page where users can view their clothing items (wardrobe). 



