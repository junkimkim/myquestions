import { DM_Sans, DM_Mono, Playfair_Display } from 'next/font/google';
import SiteBusinessFooter from '@/components/SiteBusinessFooter';
import './globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-dm-sans',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dmono',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair',
});

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://quizforge.kr';

export const metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'QuizForge — 영어 변형문제 생성기',
    template: '%s | QuizForge',
  },
  description:
    '영어 지문을 붙여넣으면 AI가 객관식·서술형·어휘·문법 등 다양한 변형문제를 자동으로 생성합니다. Word 파일 다운로드 지원.',
  openGraph: {
    title: 'QuizForge — 영어 변형문제 생성기',
    description: '영어 지문 → AI 변형문제 자동 생성 · Word 파일 다운로드',
    url: BASE_URL,
    siteName: 'QuizForge',
    locale: 'ko_KR',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'QuizForge — 영어 변형문제 생성기',
    description: '영어 지문 → AI 변형문제 자동 생성 · Word 파일 다운로드',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${dmSans.className} ${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
        {children}
        <div className="container">
          <SiteBusinessFooter />
        </div>
      </body>
    </html>
  );
}
