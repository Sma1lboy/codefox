<UXSitemap>
  <global_view>
    <global_component id="G1">
      G1. Global Navigation Bar
      Authentication Conditions: 
        - Logged-in users: Access to personalized menu items (e.g., user playlists, account settings).
        - Logged-out users: Access to login/sign-in buttons and call-to-action options (e.g., "Sign up" or "Log in").
      Elements:
        - Logo 
          1. **Type**: Interactive
          2. **Purpose**: Redirect users to the home page.
          3. **States**: Default, Hover
          4. **Interactions**: Clicking
        - Search Bar 
          1. **Type**: Input
          2. **Purpose**: Allow users to search for songs, albums or artists.
          3. **States**: Default, Focused, Typing, Hover
          4. **Interactions**: Typing, Clicking, Submitting
        - Links to Music Library, Playlists, Recommendations 
          1. **Type**: Interactive
          2. **Purpose**: Quick navigation to main sections of the app.
          3. **States**: Default, Hover, Selected
          4. **Interactions**: Clicking
    </global_component>
    
    <global_component id="G2">
      G2. Global Footer
      Authentication Conditions: 
        - Accessible to both logged-in and logged-out users.
      Elements:
        - Links to Terms of Service, Privacy Policy
          1. **Type**: Interactive
          2. **Purpose**: Provide legal and contact information to users.
          3. **States**: Default, Hover
          4. **Interactions**: Clicking
        - Social Media Icons
          1. **Type**: Interactive
          2. **Purpose**: Allow users to share content through social platforms.
          3. **States**: Default, Hover
          4. **Interactions**: Clicking
    </global_component>
    
    <global_component id="G3">
      G3. Global Sidebar
      Authentication Conditions: 
        - Logged-in users: Includes "Your Playlists", "Friends' Playlists", "Settings".
        - Logged-out users: Limited to "Music Library" and "Sign Up".
      Elements:
        - Section Links 
          1. **Type**: Interactive
          2. **Purpose**: Facilitate quick access to various sections of the site.
          3. **States**: Default, Hover, Selected
          4. **Interactions**: Clicking
    </global_component>
  </global_view>

<page_view id="P1">
P1. Home Page
URL Path: /home
Parent Page: None
Description: This is the landing page that introduces users to featured playlists and songs.
Authentication Conditions: Accessible to both logged-in and logged-out users. #### Core Components: - C1.1. Featured Playlists Section 1. **Type**: Display 2. **Purpose**: Highlight curated playlists for all users. 3. **States**: Default, Hover 4. **Interactions**: Clicking to view details. - C1.2. Recommended Songs Section 1. **Type**: Display 2. **Purpose**: Suggest songs based on the user's listening preferences (for logged-in users). 3. **States**: Default, Hover 4. **Interactions**: Clicking to listen or view details. - C1.3. Recently Played Section 1. **Type**: Display 2. **Purpose**: Allow logged-in users to easily find their recently played songs. 3. **States**: Default, Hover 4. **Interactions**: Clicking to listen again. #### Features & Functionality: - F1.1. Display Featured Playlists - Description: Showcase curated playlists. - User Stories: Users want to quickly find music they enjoy. - Components Used: C1.1, G1, G2, G3 - F1.2. Display Recommended Songs - Description: Show personalized song recommendations. - User Stories: Users want to discover new music tailored to their preferences. - Components Used: C1.2, G1, G2, G3 #### Page-Specific User Flows:
Flow 1. Discover Music 1. User lands on the home page. 2. User clicks on a featured playlist or recommended song. 3. User listens to the music or further explores playlists.
</page_view>

<page_view id="P2">
P2. Music Library
URL Path: /library
Parent Page: None
Description: A comprehensive section where users can browse their music collection.
Authentication Conditions: Full access for logged-in users; logged-out users can browse but cannot personalize. #### Core Components: - C2.1. Search Functionality 1. **Type**: Interactive 2. **Purpose**: Allow users to find specific songs, albums, or artists. 3. **States**: Default, Focused, Typing 4. **Interactions**: Typing, Submitting - C2.2. Filters 1. **Type**: Interactive 2. **Purpose**: Enable users to narrow their search by genre, artist, or album. 3. **States**: Default, Selected 4. **Interactions**: Clicking - C2.3. Display Grid 1. **Type**: Display 2. **Purpose**: Show music items in a visually accessible format. 3. **States**: Default, Hover 4. **Interactions**: Clicking to select. #### Features & Functionality: - F2.1. Search Songs, Albums, or Artists - Description: Users can find any music available in their library. - User Stories: Users want to quickly find specific content within their library. - Components Used: C2.1, C2.2, C2.3, G1, G2, G3 #### Page-Specific User Flows:
Flow 1. Search for Music 1. User enters search terms in the search bar (C2.1). 2. User applies filters (C2.2). 3. User clicks on a song or album from the display grid (C2.3).
</page_view>

<page_view id="P3">
P3. Playlists
URL Path: /playlists
Parent Page: None
Description: This page allows users to create, edit, and view playlists.
Authentication Conditions: Create, edit, and share playlists available to logged-in users only. #### Core Components: - C3.1. User Playlists List 1. **Type**: Display 2. **Purpose**: List playlists created by the user. 3. **States**: Default, Hover 4. **Interactions**: Clicking to view or edit. - C3.2. Create New Playlist Button 1. **Type**: Interactive 2. **Purpose**: Allow users to create a new playlist. 3. **States**: Default, Hover 4. **Interactions**: Clicking to open a modal. #### Features & Functionality: - F3.1. Create and Manage Playlists - Description: Users can create new playlists and manage existing ones. - User Stories: Users want to have the ability to curate their music. - Components Used: C3.1, C3.2, G1, G2, G3 #### Page-Specific User Flows:
Flow 1. Create a New Playlist 1. User clicks the "Create New Playlist" button (C3.2). 2. User enters a name and saves the playlist. 3. User adds songs to the newly created playlist.
</page_view>

<page_view id="P4">
P4. Playlist Details
URL Path: /playlists/:playlistId
Parent Page: P3. Playlists
Description: Displays the details of a specific playlist, including tracks.
Authentication Conditions: Restricted to logged-in users. Users can only view public playlists if logged out. #### Core Components: - C4.1. Playlist Title and Description 1. **Type**: Display 2. **Purpose**: Communicate the theme and contents of the playlist. 3. **States**: Default 4. **Interactions**: Viewing - C4.2. List of Songs 1. **Type**: Display 2. **Purpose**: Show the songs in the playlist with playback options. 3. **States**: Default, Hover 4. **Interactions**: Clicking play buttons. - C4.3. Share Playlist Button 1. **Type**: Interactive 2. **Purpose**: Allow users to share the playlist on social media. 3. **States**: Default, Hover 4. **Interactions**: Clicking to initiate sharing. #### Features & Functionality: - F4.1. View and Share Playlists - Description: Users can see details and share their playlists. - User Stories: Users want to share their music selections with friends. - Components Used: C4.1, C4.2, C4.3, G1, G2, G3 #### Page-Specific User Flows:
Flow 1. Share a Playlist 1. User views the playlist details (C4.1, C4.2). 2. User clicks on the "Share" button (C4.3). 3. User selects a sharing option and shares it.
</page_view>

<page_view id="P5">
P5. Search Results
URL Path: /search
Parent Page: None
Description: Displays results based on user search queries.
Authentication Conditions: Accessible to logged-in and logged-out users. #### Core Components: - C5.1. Dynamic Search Results 1. **Type**: Display 2. **Purpose**: Show results relevant to the user’s search. 3. **States**: Default, Highlighted 4. **Interactions**: Clicking to view details. #### Features & Functionality: - F5.1. View Search Results - Description: Users can view the results of their searches. - User Stories: Users want to find specific songs without difficulty. - Components Used: C5.1, G1, G2, G3 #### Page-Specific User Flows:
Flow 1. View Search Results 1. User types a search term into the search bar (in G1). 2. User views the dynamic results (C5.1). 3. User clicks on a song to play or view details.
</page_view>

<page_view id="P6">
P6. Account Settings
URL Path: /settings
Parent Page: None
Description: Allows users to manage their account features and settings.
Authentication Conditions: Accessible to logged-in users only. #### Core Components: - C6.1. Profile Information 1. **Type**: Display 2. **Purpose**: Show user details for updating settings. 3. **States**: Default 4. **Interactions**: Viewing - C6.2. Change Password Option 1. **Type**: Input 2. **Purpose**: Provide an option for users to update their passwords. 3. **States**: Default, Focused 4. **Interactions**: Typing, Submitting - C6.3. Logout Button 1. **Type**: Interactive 2. **Purpose**: Allow users to securely log out. 3. **States**: Default, Hover 4. **Interactions**: Clicking #### Features & Functionality: - F6.1. Manage Account Settings - Description: Users can update their profile and security settings. - User Stories: Users want control over their account security and information. - Components Used: C6.1, C6.2, C6.3, G1, G2 #### Page-Specific User Flows:
Flow 1. Update Profile Information 1. User views their profile information (C6.1). 2. User edits the desired field and submits changes (C6.2). 3. User logs out if needed (C6.3).
</page_view>

<page_view id="P7">
P7. Lyrics
URL Path: /lyrics/:songId
Parent Page: None
Description: Displays the lyrics synced with the currently playing song.
Authentication Conditions: Accessible to logged-in and logged-out users. #### Core Components: - C7.1. Current Song Lyrics 1. **Type**: Display 2. **Purpose**: Show the lyrics of the currently playing song. 3. **States**: Default, Highlighted 4. **Interactions**: Viewing #### Features & Functionality: - F7.1. View Song Lyrics - Description: Users can see the lyrics as the song is playing. - User Stories: Users want to sing along or understand the lyrics better. - Components Used: C7.1, G1, G2, G3 #### Page-Specific User Flows:
Flow 1. View Lyrics While Playing 1. User listens to a song using the music player. 2. User navigates to the lyrics page (from the music player interface). 3. User views the lyrics displayed (C7.1) as the song plays.
</page_view>

</UXSitemap>
