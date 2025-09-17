import { redirect } from 'next/navigation';

export default function Home() {
  // Always land on the dashboard in dev/preview.
  redirect('/dashboard');
}
