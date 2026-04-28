import LoginForm from '@/components/auth/LoginForm'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth';

export default async function LoginPage() {
  if (await getCurrentUser()) {
    redirect('/dashboard')
  }

  return <LoginForm />
}
