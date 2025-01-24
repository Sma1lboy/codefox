{
  "files": {
    "src/components/common/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/common/index.css": {
      "dependsOn": []
    },
    "src/components/layout/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/layout/index.css": {
      "dependsOn": []
    },
    "src/components/specific/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/specific/index.css": {
      "dependsOn": []
    },
    "src/contexts/AuthContext.tsx": {
      "dependsOn": []
    },
    "src/contexts/ThemeContext.tsx": {
      "dependsOn": []
    },
    "src/contexts/PlayerContext.tsx": {
      "dependsOn": []
    },
    "src/hooks/useAuth.ts": {
      "dependsOn": ["../contexts/AuthContext.tsx"]
    },
    "src/hooks/useMusicPlayer.ts": {
      "dependsOn": ["../contexts/PlayerContext.tsx"]
    },
    "src/hooks/useFetch.ts": {
      "dependsOn": []
    },
    "src/hooks/usePlaylist.ts": {
      "dependsOn": []
    },
    "src/pages/Home/index.tsx": {
      "dependsOn": ["./index.css", "../../components/common/index.tsx", "../../hooks/useFetch.ts"]
    },
    "src/pages/Home/index.css": {
      "dependsOn": []
    },
    "src/pages/MusicLibrary/index.tsx": {
      "dependsOn": ["./index.css", "../../components/common/index.tsx", "../../hooks/useFetch.ts"]
    },
    "src/pages/MusicLibrary/index.css": {
      "dependsOn": []
    },
    "src/pages/Playlists/index.tsx": {
      "dependsOn": ["./index.css", "../../components/common/index.tsx", "../../hooks/usePlaylist.ts"]
    },
    "src/pages/Playlists/index.css": {
      "dependsOn": []
    },
    "src/pages/PlaylistDetails/index.tsx": {
      "dependsOn": ["./index.css", "../../components/common/index.tsx", "../../hooks/usePlaylist.ts"]
    },
    "src/pages/PlaylistDetails/index.css": {
      "dependsOn": []
    },
    "src/pages/SearchResults/index.tsx": {
      "dependsOn": ["./index.css", "../../components/common/index.tsx", "../../hooks/useFetch.ts"]
    },
    "src/pages/SearchResults/index.css": {
      "dependsOn": []
    },
    "src/pages/AccountSettings/index.tsx": {
      "dependsOn": ["./index.css", "../../components/common/index.tsx", "../../hooks/useFetch.ts", "../../hooks/useAuth.ts"]
    },
    "src/pages/AccountSettings/index.css": {
      "dependsOn": []
    },
    "src/pages/Lyrics/index.tsx": {
      "dependsOn": ["./index.css", "../../components/common/index.tsx"]
    },
    "src/pages/Lyrics/index.css": {
      "dependsOn": []
    },
    "src/utils/constants.ts": {
      "dependsOn": []
    },
    "src/utils/helpers.ts": {
      "dependsOn": []
    },
    "src/utils/validators.ts": {
      "dependsOn": []
    },
    "src/api/auth.ts": {
      "dependsOn": []
    },
    "src/api/music.ts": {
      "dependsOn": []
    },
    "src/api/user.ts": {
      "dependsOn": []
    },
    "src/router.ts": {
      "dependsOn": []
    },
    "src/index.tsx": {
      "dependsOn": []
    }
  }
}