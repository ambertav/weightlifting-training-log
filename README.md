
# Weightlifting Training Log

A web application built via a MEN stack, that allows users to track olympic weightlifting workouts for the week.

**[Click here](https://weightlifting-log.herokuapp.com/) to see the deployed application!**

## Technologies Used

- Node.js
- Express.js
- MongoDB
- Mongoose
- HTML5
- CSS3
- JavaScript
- AWS S3
- Embedded JavaScript
- jQuery
- bcrypt
- Chart.js
- Bootstrap
- Heroku

## Screenshots


![workouts index](https://i.imgur.com/4uFRbm2.png "Workout Main Page")
Workouts Main page<br><br>

![workouts show](https://i.imgur.com/3VVqFWy.png "Workout Show Page")
Workouts detailed show page<br><br>

![movements index](https://i.imgur.com/xrxwE3x.png "Movements Main Page")
Movements Main Page<br><br>

![favorites show](https://i.imgur.com/vStZ0qv.png "Favorites Show Page")
Favorites detailed show page<br><br>

![user profile](https://i.imgur.com/dD2aDpG.png "User Profile Page")
Signed in user's own profile page<br><br>


## Getting Started

### `Signup, Login`
- Sign up using with password confirmation and bycrpt encryption
- Login with email and password


### `Workouts`
- Perform full CRUD on their workouts for the week
- The workouts are comprised of a collection of exercises
    - Each exercise reference movements, and stores:
        - Minutes and calories burned, if the movement is cardio
        - Weighted used, the sets and reps performed, if the movement is weighted
- Check off each exercise within workout, see progress bar completion
- Workout deletion must be initiated by user


### `Movements`
- Access to default or custom movements, which the user can edit and delete
- The deletion of a movement removes all instances of any associated exercises within the user's current workouts
- Filter through movements by muscle group


### `Search for Other Users, Create Friend Requests`
- Search for other users by username
- View other user's profile pages and make friend requests


### `Favorites`
- Save workouts by creating a favorite
- The exercises within a favorite do not directly reference a movement, and thus are not impacted by the deletion of a movement
- Copy favorite down and create a workout
    - If the movement for an exercise does not exist, the movement is created for the user
- Share favorites with friends


### `Profile Page`
- Manage pending friend requests, and view friend's list
- Update bio and profile photo
- View muscle distribution graph and cardiovascular stats table


#### `Muscle Distribution`
- Doughnut chart that showcases the percentage breakdown of muscles worked throughout the workout week
    - Percentages are determined by taking equal weight between all the muscle groups worked by a particular movement and determining the volume (the product between the sets and reps defined within an exercise) of each muscle group per movement
- Visually displays the percentage of volume per muscle in relation to the total volume done by the user

#### `Cardiovascular Stats`
- Table that sums up the total number of minutes and calories burned by the user throughout the week
- Do not differentiate bewteen each of the cardio movements

### **[Click here](https://weightlifting-log.herokuapp.com/) to see the deployed application!**


## Future Enhancements

To enable the user to:

- Delete an existing friendship and/or block another user
- Rate the difficulty of a favorite workout
- Accept or deny favorites that are shared with them, prior to saving the favorite for them
- Easily find a particular favorite within the index page, via pagination and a search feature
- Search the movements index page for a specific movement
- Differentiate between the cardiovascular stats per each cardio movement
- View embedded how-to videos detailing how to execute a particular movement
- Expand planning and tracking workouts to monthly/yearly