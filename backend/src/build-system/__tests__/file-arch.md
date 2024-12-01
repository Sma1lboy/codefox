<GENERATEDCODE>
{
  "files": {
    "src/api/auth.ts": {
      "dependsOn": []
    },
    "src/api/music.ts": {
      "dependsOn": []
    },
    "src/api/user.ts": {
      "dependsOn": []
    },
    "src/api/index.ts": {
      "dependsOn": ["./auth", "./music", "./user"]
    },
    "src/components/common/Button/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/common/Input/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/common/Loader/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/layout/Header/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/layout/Footer/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/layout/Sidebar/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/specific/MusicDetail/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/specific/Playlist/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/specific/Search/index.tsx": {
      "dependsOn": ["./index.css"]
    },
    "src/components/index.ts": {
      "dependsOn": ["./common/Button", "./common/Input", "./common/Loader", "./layout/Header", "./layout/Footer", "./layout/Sidebar", "./specific/MusicDetail", "./specific/Playlist", "./specific/Search"]
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
    "src/contexts/index.ts": {
      "dependsOn": ["./AuthContext", "./ThemeContext", "./PlayerContext"]
    },
    "src/hooks/useAuth.ts": {
      "dependsOn": ["../contexts/AuthContext"]
    },
    "src/hooks/useMusic.ts": {
      "dependsOn": []
    },
    "src/hooks/useUser.ts": {
      "dependsOn": ["../contexts/AuthContext"]
    },
    "src/hooks/index.ts": {
      "dependsOn": ["./useAuth", "./useMusic", "./useUser"]
    },
    "src/pages/Home/index.tsx": {
      "dependsOn": ["./Home.css", "../../components", "../../hooks/useMusic", "../../hooks/useUser"]
    },
    "src/pages/Home/Home.css": {
      "dependsOn": []
    },
    "src/pages/Discover/index.tsx": {
      "dependsOn": ["./Discover.css", "../../components", "../../hooks/useMusic"]
    },
    "src/pages/Discover/Discover.css": {
      "dependsOn": []
    },
    "src/pages/Playlists/index.tsx": {
      "dependsOn": ["./Playlists.css", "../../components", "../../hooks/useMusic", "../../hooks/useUser"]
    },
    "src/pages/Playlists/Playlists.css": {
      "dependsOn": []
    },
    "src/pages/Artists/index.tsx": {
      "dependsOn": ["./Artists.css", "../../components"]
    },
    "src/pages/Artists/Artists.css": {
      "dependsOn": []
    },
    "src/pages/Profile/index.tsx": {
      "dependsOn": ["./Profile.css", "../../components", "../../hooks/useUser"]
    },
    "src/pages/Profile/Profile.css": {
      "dependsOn": []
    },
    "src/pages/Login/index.tsx": {
      "dependsOn": ["./Login.css", "../../components", "../../hooks/useAuth"]
    },
    "src/pages/Login/Login.css": {
      "dependsOn": []
    },
    "src/pages/index.ts": {
      "dependsOn": ["./Home", "./Discover", "./Playlists", "./Artists", "./Profile", "./Login"]
    },
    "src/router.ts": {
      "dependsOn": ["./pages"]
    },
    "src/index.ts": {
      "dependsOn": ["./router"]
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
    "src/utils/index.ts": {
      "dependsOn": ["./constants", "./helpers", "./validators"]
    }
  }
}
</GENERATEDCODE>