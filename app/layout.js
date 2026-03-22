import { DM_Sans, DM_Mono, Playfair_Display } from 'next/font/google';
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

export const metadata = {
  title: 'QuizForge — 영어 변형문제 생성기',
  description: '영어 지문 → AI 변형문제 자동 생성 · Word 파일 다운로드',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body className={`${dmSans.className} ${dmSans.variable} ${dmMono.variable} ${playfair.variable}`}>
        {children}
      </body>
    </html>
  );
}
