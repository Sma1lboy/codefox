# Detailed UX Structure Map: Spotify-like Music Web Application

## **1. Home Page**

### Page Purpose

Provide users with quick access to featured playlists, personalized recommendations, new releases, and music genres.

### Core Elements

- **Header**:
  - Logo: Navigate back to the home page.
  - Search Bar: Quick access to search functionality.
  - Navigation Links: Home, Search, Library, Account.
- **Main Content Area**:
  - **Featured Playlists**: Grid of curated playlists with cover images and titles.
    - Interactions: Click to navigate to the playlist page.
  - **Personalized Recommendations**: Horizontal scroll carousel of songs and albums tailored to the user.
    - Dynamic Content: Updates based on user listening history.
  - **New Releases**: Grid displaying recently released albums or singles.
    - Interactions: Click to open album details.
  - **Genres**: List of genres represented as clickable tiles.
- **Footer**:
  - Persistent music player bar with play/pause, skip, and volume controls.

### Content Display

- Visual hierarchy prioritizing featured content and recommendations.
- Dynamic updates to reflect user preferences and real-time data.

### Navigation and Routes

- `/home`: Main route for the home page.
- Links to `/playlist/:id`, `/album/:id`, `/genre/:id`.

### Restrictions

- Requires user login to display personalized recommendations.

---

## **2. Search Page**

### Page Purpose

Allow users to search for specific songs, albums, artists, or playlists and view categorized results.

### Core Elements

- **Header**:
  - Logo, Navigation Links, and Search Bar (persistent from Home Page).
- **Search Results Section**:
  - **Songs**: List of matching songs with play buttons.
  - **Albums**: Grid of albums with cover art and titles.
  - **Artists**: Horizontal scroll carousel of artists.
  - **Playlists**: List of curated and user-created playlists.
- **No Results Message**: Display when no matching content is found.

### Content Display

- Results categorized and clearly separated.
- Real-time search suggestions displayed as user types.

### Navigation and Routes

- `/search`: Search page route.
- Links to `/song/:id`, `/album/:id`, `/artist/:id`, `/playlist/:id`.

### Restrictions

- Accessible without login but limited to generic content unless logged in.

---

## **3. Library Page**

### Page Purpose

Provide users access to their playlists, liked songs, and recently played music.

### Core Elements

- **Header**:
  - Persistent header with navigation and search.
- **Library Sections**:
  - **My Playlists**: List of user-created playlists.
    - Actions: Edit, delete, reorder.
  - **Liked Songs**: List of favorited songs with play buttons.
  - **Recently Played**: List of previously played songs and playlists.

### Content Display

- Organize content with clear sections and labels.
- Show metadata (e.g., song duration, artist) for user context.

### Navigation and Routes

- `/library`: Library main page route.
- Links to `/playlist/:id`, `/song/:id`.

### Restrictions

- Requires login to access user-specific content.

---

## **4. Playlist/Album/Genre Pages**

### Page Purpose

Allow users to view and play content within a specific playlist, album, or genre.

### Core Elements

- **Header**:
  - Back Button: Navigate to the previous page.
  - Playlist/Album/Genre Name: Display prominently.
- **Content Section**:
  - **Playlist/Album Info**: Cover art, title, creator name, description.
  - **Track List**: List of songs with play buttons and metadata.
  - **Action Buttons**:
    - Play All: Start playing all tracks in order.
    - Add to Library: Save playlist/album to user library (if applicable).
- **Footer**:
  - Persistent music player bar.

### Content Display

- Highlight album or playlist cover and metadata for context.
- Easy access to play all tracks or individual songs.

### Navigation and Routes

- `/playlist/:id`, `/album/:id`, `/genre/:id`.

### Restrictions

- Accessible without login, but restricted to sample tracks if not logged in.

---

## **5. Player Page (Now Playing)**

### Page Purpose

Provide full controls for the currently playing track.

### Core Elements

- **Header**:
  - Back Button: Navigate to the previous page.
- **Main Player Controls**:
  - Song Info: Display song title, artist, album cover.
  - Play/Pause, Skip, Seek Bar, Volume Controls.
- **Lyrics Section**:
  - Toggle to view lyrics for the current track (if available).
- **Queue Section**:
  - List of upcoming tracks with reordering options.

### Content Display

- Centralized focus on the current track with controls easily accessible.

### Navigation and Routes

- `/player`.

### Restrictions

- Requires active playback session.

---

## **6. Account Page**

### Page Purpose

Allow users to manage profile settings and preferences.

### Core Elements

- **Header**:
  - Persistent navigation and search.
- **Profile Info Section**:
  - Display user profile details (username, email).
  - Edit button for updating profile.
- **Preferences Section**:
  - Toggle for dark mode/light mode.
  - Audio quality selection.
- **Logout Button**:
  - Prominent button to securely log out.

### Content Display

- Clear sections for profile details and app preferences.
- Easy access to frequently updated settings.

### Navigation and Routes

- `/account`.

### Restrictions

- Requires login.

---

## **7. Onboarding Pages**

### Page Purpose

Guide new users through account setup and app features.

### Core Elements

- **Welcome Screen**:
  - Brief intro to the app.
  - Buttons to log in or sign up.
- **Sign-Up Page**:
  - Fields for username, email, password.
  - Option to sign up via Google or Facebook.
- **Login Page**:
  - Username and password fields.
  - Forgot Password link.

### Content Display

- Minimal text to streamline onboarding.
- Prominent call-to-action buttons.

### Navigation and Routes

- `/welcome`, `/signup`, `/login`.

### Restrictions

- Accessible to all users without restrictions.

---

## **8. Error and Offline Pages**

### Page Purpose

Provide feedback for errors and offline scenarios.

### Core Elements

- **404 Page**:
  - Message indicating content not found.
  - Button to return to Home.
- **Offline Mode**:
  - Notification about internet connectivity issues.
  - Limited access to downloaded or cached content.

### Content Display

- Clear messaging and actionable steps for users.

### Navigation and Routes

- `/404`, `/offline`.

### Restrictions

- Accessible in all scenarios.

---

## **Dynamic Content and Restrictions Summary**

- **Dynamic Content**:
  - Recommendations, playlists, recently played, and search results update in real-time based on user activity.
- **Restrictions**:
  - Login required for personalized content, library access, and playback history.
