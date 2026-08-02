import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LoginForm } from '@/features/auth/components/login-form';

export const metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-2xl">Sign in</CardTitle>
        <CardDescription>Welcome back — enter your credentials to continue.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
      </CardContent>
    </Card>
  );
}
