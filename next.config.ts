import type { NextConfig } from "next";

const appVersion =
  process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.GIT_COMMIT_SHA?.slice(0, 7) ??
  process.env.npm_package_version ??
  "0.1.0";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://orxbzbklnjifacjeamym.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9yeGJ6YmtsbmppZmFjamVhbXltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NzE4NjEsImV4cCI6MjA5MjI0Nzg2MX0.JGwDdcrGKM8K2V-3B-9WE6H0qD9-mbFwaTiSzWL2z68";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: supabaseAnonKey
  }
};

export default nextConfig;
