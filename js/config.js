/**
 * AISA COMPANION - CONFIGURATION & NEURAL CONSTANTS
 * Miyazaki Haruto Entertainment Co., Ltd. - Project MHEnt. Universe
 */
window.AISA_CONFIG = {
  APP_NAME: "AISA Companion",
  SUBTITLE: "Personal Companion AI Sanctuary",
  VERSION: "2.2.0-Multimodal",
  
  // Cloudflare Workers AI Endpoint & Multiverse Model
  API_BASE_URL: "https://api.mhentuniverse.com",
  FALLBACK_API_URL: "https://aisa.mhentuniverse.com",
  OLLAMA_BASE_URL: "http://localhost:11434",
  MODEL: localStorage.getItem("aisa_selected_model") || "aisa-v1",
  MODELS: [
    { id: "aisa-v1", name: "AISA v1", desc: "Companion Song Hành • Harmony 🌸 & Echo 😈", icon: "🌸", badge: "Cloud Mặc định" },
    { id: "aisa-local-3b", name: "AISA Local 3B", desc: "Offline RTX 4050 • Siêu nhẹ, siêu nhanh (Gaming mode)", icon: "⚡", badge: "Local 3B" },
    { id: "aisa-local-7b", name: "AISA Local 7B", desc: "Offline RTX 4050 • Sâu sắc, thấu cảm & trí tuệ cao", icon: "🧠", badge: "Local 7B" },
    { id: "aisa-scholar-v1", name: "AISA Scholar v1", desc: "Nghiên cứu & Học tập Ngoại ngữ Study", icon: "📚", badge: "Study" },
    { id: "aisa-workspace-v1", name: "AISA Workspace v1", desc: "Quản trị Task, Lịch trình & Mail Workspace", icon: "💼", badge: "Workspace" },
    { id: "aisa-universe-v1", name: "AISA Universe v1", desc: "Cổng Thông tin & Dịch vụ Vũ trụ Universe", icon: "🌌", badge: "Universe" }
  ],

  // Supabase Configuration
  SUPABASE: {
    URL: "https://ctzkgchjheirxwejctvl.supabase.co",
    ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN0emtnY2hqaGVpcnh3ZWpjdHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNjA0MTgsImV4cCI6MjA5MTgzNjQxOH0.Wl-sBpH1VvcR6-Y4D4UAVm1f5_brGK3cVIHRJBEhOJ0"
  },

  // Default User Profile (Dynamically loaded from Auth or Custom Storage)
  USER: {
    id: "user-current",
    name: localStorage.getItem("aisa_user_display_name") || "Master Yurika",
    realName: "Master Yurika",
    role: "Founder • MHEnt Universe",
    avatar: "🌸"
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
