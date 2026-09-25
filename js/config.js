/**
 * AISA COMPANION - CONFIGURATION & NEURAL CONSTANTS
 * Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe
 */
window.AISA_CONFIG = {
  APP_NAME: "AISA Companion",
  SUBTITLE: "Personal Companion AI Sanctuary",
  VERSION: "2.2.0-Multimodal",
  
  // Cloudflare Workers AI Endpoint
  API_BASE_URL: "https://api.mhentuniverse.com",
  FALLBACK_API_URL: "https://aisa.mhentuniverse.com",

  // Supabase Configuration
  SUPABASE: {
    URL: "https://ctzkgchjheirxwejctvl.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0"
  },

  // Default User / Companion Master
  USER: {
    id: "user-master-01",
    name: "Yurika",
    role: "Master / Creator",
    avatar: "👑"
  },

  // Firebase Configuration (Matching MHEnt Universe & Workspace)
  FIREBASE: {
    apiKey: "AIzaSyDKDAAnmeqWFRqUZWTVa--m5-cORyHCoUk",
    authDomain: "mhentuniverse.firebaseapp.com",
    projectId: "mhentuniverse",
    storageBucket: "mhentuniverse.firebasestorage.app",
    messagingSenderId: "377044322952",
    appId: "1:377044322952:web:d657d1b0806d37d9246d3d"
  },

  // Gatekeeper Security & Access Control
  AUTH: {
    ORG_DOMAIN: "@mhentuniverse.internal",
    // Allowed accounts that can enter AISA Sanctuary:
    ALLOWED_ROLES: ["master", "admin"],
    // Default allowed email prefixes / patterns:
    ALLOWED_EMAILS: [
      "yurika@mhentuniverse.internal",
      "master@mhentuniverse.internal",
      "admin@mhentuniverse.com",
      "yurika"
    ]
  },

  // Storage Keys
  STORAGE: {
    HISTORY: "aisa_companion_history_v2",
    SESSIONS: "aisa_companion_sessions_v2",
    ACTIVE_SESSION: "aisa_active_session_id_v2",
    SETTINGS: "aisa_companion_settings",
    ACTIVE_SCOPE: "aisa_active_scope",
    ACTIVE_MODE: "aisa_active_mode",
    SAVED_MEMORIES: "aisa_local_memories",
    GEMINI_KEY: "mhent_ai_api_key"
  }
};

// Aliases for compatibility
window.firebaseConfig = window.AISA_CONFIG.FIREBASE;
