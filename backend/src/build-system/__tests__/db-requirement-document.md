### Database Requirements Document

#### 1. Overview

- **Project Scope**: Design and implement a database to support a Spotify-like music web application, facilitating personalized music streaming, content management, and user interaction.
- **Database Purpose**: Store and manage user profiles, music content, playlists, playback states, and preferences to support dynamic, personalized user experiences.
- **General Requirements**:
  - Ensure high availability and scalability to handle concurrent user activity.
  - Support real-time data updates for personalized recommendations and playback.
  - Ensure data integrity and enforce business rules.

---

#### 2. Entity Definitions

##### User

- **Description**: Represents registered users of the application.
- **Business Rules**:
  - Each user must have a unique email.
  - Users can manage their preferences and account details.
- **Key Attributes**:
  - `user_id` (Primary Key)
  - `username` (Unique, required)
  - `email` (Unique, required)
  - `password_hash` (Required)
  - `subscription_type` (e.g., Free, Premium)
  - `preferences` (e.g., theme, audio quality)
  - `created_at`, `updated_at`
- **Relationships**:
  - One-to-many with `Playlist`.
  - Many-to-many with `Song` for liked songs.

##### Song

- **Description**: Represents individual songs available on the platform.
- **Business Rules**:
  - Each song must have an associated album and artist.
  - Songs may belong to multiple playlists.
- **Key Attributes**:
  - `song_id` (Primary Key)
  - `title` (Required)
  - `artist_id` (Foreign Key)
  - `album_id` (Foreign Key)
  - `duration` (In seconds)
  - `genre` (Category)
  - `release_date`
- **Relationships**:
  - Many-to-one with `Album` and `Artist`.
  - Many-to-many with `Playlist`.

##### Artist

- **Description**: Represents artists whose songs are on the platform.
- **Key Attributes**:
  - `artist_id` (Primary Key)
  - `name` (Required)
  - `bio`
  - `profile_image`
  - `created_at`, `updated_at`
- **Relationships**:
  - One-to-many with `Song` and `Album`.

##### Album

- **Description**: Represents music albums.
- **Key Attributes**:
  - `album_id` (Primary Key)
  - `title` (Required)
  - `artist_id` (Foreign Key)
  - `release_date`
  - `cover_image`
- **Relationships**:
  - One-to-many with `Song`.

##### Playlist

- **Description**: Represents user-created or curated playlists.
- **Business Rules**:
  - A playlist must belong to a user or be globally curated.
- **Key Attributes**:
  - `playlist_id` (Primary Key)
  - `name` (Required)
  - `user_id` (Foreign Key, nullable for curated playlists)
  - `description`
  - `is_curated` (Boolean)
  - `created_at`, `updated_at`
- **Relationships**:
  - Many-to-many with `Song`.

##### PlaybackState

- **Description**: Tracks the playback state for a user.
- **Key Attributes**:
  - `playback_id` (Primary Key)
  - `user_id` (Foreign Key)
  - `current_song_id` (Foreign Key)
  - `queue` (Array of `song_id`s)
  - `playback_position` (Seconds)
  - `volume`
  - `created_at`, `updated_at`

##### Recommendation

- **Description**: Stores dynamic recommendations for users.
- **Key Attributes**:
  - `recommendation_id` (Primary Key)
  - `user_id` (Foreign Key)
  - `content` (JSON: list of recommended songs, albums, playlists)
  - `generated_at`

---

#### 3. Data Requirements

##### User

- Fields:
  - `user_id`: UUID
  - `username`: String (max 50)
  - `email`: String (unique, max 100)
  - `password_hash`: String
  - `subscription_type`: Enum (Free, Premium)
  - `preferences`: JSON
  - `created_at`, `updated_at`: Timestamps
- Constraints:
  - `email` and `username` must be unique.
  - Enforce non-null constraints on required fields.
- Indexing:
  - Index on `email` and `user_id`.

##### Song

- Fields:
  - `song_id`: UUID
  - `title`: String (max 100)
  - `artist_id`, `album_id`: Foreign Keys
  - `duration`: Integer
  - `genre`: String
  - `release_date`: Date
- Constraints:
  - Non-null constraints on `title`, `artist_id`, and `album_id`.
- Indexing:
  - Index on `title` and `genre`.

##### Playlist

- Fields:
  - `playlist_id`: UUID
  - `name`: String (max 50)
  - `user_id`: Foreign Key
  - `description`: String
  - `is_curated`: Boolean
  - `created_at`, `updated_at`: Timestamps
- Constraints:
  - Enforce foreign key constraints for `user_id`.
- Indexing:
  - Index on `user_id`.

##### PlaybackState

- Fields:
  - `playback_id`: UUID
  - `user_id`: Foreign Key
  - `current_song_id`: Foreign Key
  - `queue`: JSON
  - `playback_position`: Integer
  - `volume`: Float
  - `created_at`, `updated_at`: Timestamps
- Constraints:
  - Ensure valid `user_id` and `current_song_id`.

---

#### 4. Relationships

- `User` to `Playlist`: One-to-many.
- `Playlist` to `Song`: Many-to-many (junction table: `playlist_song`).
- `Song` to `Album`: Many-to-one.
- `Song` to `Artist`: Many-to-one.
- `User` to `PlaybackState`: One-to-one.
- Referential Integrity:
  - Cascade delete for dependent entities (e.g., playlists when a user is deleted).

---

#### 5. Data Access Patterns

- Common Queries:
  - Fetch user playlists, liked songs, and playback state.
  - Search for songs, albums, or artists.
  - Fetch recommended content dynamically.
- Indexing:
  - Full-text search for song titles and artist names.
  - Index on foreign keys for join performance.

---

#### 6. Security Requirements

- Access Control:
  - Restrict user data to authenticated sessions.
- Data Privacy:
  - Hash sensitive data (e.g., passwords).
- Audit:
  - Log user activity and data changes.

---

#### 7. Performance Requirements

- Expected Volume:
  - Millions of songs and playlists.
  - Thousands of concurrent users.
- Growth:
  - Plan for 10x growth in user and song data over 5 years.
- Optimizations:
  - Cache frequently accessed data (e.g., recommendations).
  - Use partitioning for large tables.

---

#### 8. Additional Considerations

- Backups:
  - Automated daily backups.
- Archiving:
  - Move inactive playlists to archival storage after 1 year.
- Integration:
  - Support for third-party authentication and external APIs.
