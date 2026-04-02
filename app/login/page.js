import LoginClient from './LoginClient';

export default async function LoginPage({ searchParams }) {
  const params = await searchParams;
  const next = typeof params.next === 'string' ? params.next : '/';
  const configError = params.error === 'config';

  return <LoginClient initialNext={next} configError={configError} />;
}
