/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 15 default segment explorer can break RSC dev (client manifest / webpack `.call`).
    devtoolSegmentExplorer: false,
  },
  images: {
    remotePatterns: [
      // Google OAuth 아바타
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      // Kakao OAuth 아바타
      { protocol: 'https', hostname: 'k.kakaocdn.net' },
    ],
  },
};

export default nextConfig;
