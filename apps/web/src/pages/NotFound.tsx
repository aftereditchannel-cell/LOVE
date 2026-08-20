import { Link } from 'react-router-dom';
import { Glass, Button } from '../ui/components';

export default function NotFound() {
  return (
    <div className="min-h-dvh flex items-center justify-center p-5">
      <Glass className="p-10 text-center max-w-sm">
        <div className="text-5xl mb-4">🌫️</div>
        <div className="font-bold mb-2">این صفحه وجود نداره</div>
        <div className="text-sm text-muted2 mb-5">شاید آدرس رو اشتباه اومدی…</div>
        <Link to="/dashboard"><Button className="w-full">برگرد به خونه ❤️</Button></Link>
      </Glass>
    </div>
  );
}
