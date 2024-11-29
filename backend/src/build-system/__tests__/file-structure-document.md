src/
├── api/                      # API logic for interacting with backend services
│   ├── auth.ts               # Authentication API logic
│   ├── music.ts              # API for music-related actions (e.g., fetching playlists, songs)
│   ├── user.ts               # API for user-related actions (e.g., profile updates)
│   └── index.ts              # Exports all API modules for centralized access
├── components/               # Reusable UI components
│   ├── common/               # Generic components used across the app
│   │   ├── Button/           # Button component folder
│   │   │   ├── index.tsx     # Main Button component file
│   │   │   └── index.css     # Button-specific styles
│   │   ├── Input/            # Input field component folder
│   │   │   ├── index.tsx     # Main Input component file
│   │   │   └── index.css     # Input-specific styles
│   │   ├── Modal/            # Modal component folder
│   │   │   ├── index.tsx     # Main Modal component file
│   │   │   └── index.css     # Modal-specific styles
│   ├── layout/               # Components for layout and structure
│   │   ├── Header/           # Header component folder
│   │   │   ├── index.tsx     # Main Header component file
│   │   │   └── index.css     # Header-specific styles
│   │   ├── Footer/           # Footer component folder
│   │   │   ├── index.tsx     # Main Footer component file
│   │   │   └── index.css     # Footer-specific styles
│   ├── specific/             # Page-specific components
│   │   ├── Home/             # Components specific to the Home page
│   │   │   ├── FeaturedPlaylists.tsx # Component for featured playlists section
│   │   │   ├── Recommendations.tsx  # Component for personalized recommendations
│   │   │   └── NewReleases.tsx      # Component for new releases
│   │   ├── Search/           # Components specific to the Search page
│   │   │   ├── SearchResults.tsx    # Component for displaying search results
│   │   │   └── Autocomplete.tsx     # Component for search suggestions
│   │   ├── Library/          # Components specific to the Library page
│   │   │   ├── MyPlaylists.tsx      # Component for user playlists
│   │   │   ├── LikedSongs.tsx       # Component for liked songs
│   │   │   └── RecentlyPlayed.tsx   # Component for recently played songs
├── contexts/                 # Context providers for global state
│   ├── AuthContext.tsx       # Provides user authentication state
│   ├── ThemeContext.tsx      # Provides theme (dark/light mode) state
│   ├── PlayerContext.tsx     # Provides music player state and controls
│   └── index.ts              # Centralized export for contexts
├── hooks/                    # Custom hooks for data fetching and state management
│   ├── useAuth.ts            # Hook for user authentication logic
│   ├── usePlayer.ts          # Hook for controlling the music player
│   ├── useTheme.ts           # Hook for managing theme preferences
│   └── useFetch.ts           # Generic hook for data fetching
├── pages/                    # Route-specific views
│   ├── Home/                 # Home page folder
│   │   ├── index.tsx         # Main Home page component
│   │   └── index.css         # Home page-specific styles
│   ├── Search/               # Search page folder
│   │   ├── index.tsx         # Main Search page component
│   │   └── index.css         # Search page-specific styles
│   ├── Library/              # Library page folder
│   │   ├── index.tsx         # Main Library page component
│   │   └── index.css         # Library page-specific styles
│   ├── Playlist/             # Playlist page folder
│   │   ├── index.tsx         # Main Playlist page component
│   │   └── index.css         # Playlist page-specific styles
│   ├── Account/              # Account page folder
│   │   ├── index.tsx         # Main Account page component
│   │   └── index.css         # Account page-specific styles
│   ├── Player/               # Player page folder
│   │   ├── index.tsx         # Main Player page component
│   │   └── index.css         # Player page-specific styles
│   ├── Error/                # Error and Offline pages folder
│   │   ├── NotFound.tsx      # 404 Page component
│   │   ├── Offline.tsx       # Offline mode page component
│   │   └── index.css         # Styles for error pages
├── utils/                    # Utility functions
│   ├── constants.ts          # Application-wide constants
│   ├── helpers.ts            # Helper functions
│   ├── validators.ts         # Validation logic
│   └── index.ts              # Centralized export for utilities
├── router.ts                 # Central routing configuration
├── index.tsx                 # Application entry point
└── App.tsx                   # Main application component