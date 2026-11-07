import { Link } from 'waku';

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16">
      <p className="text-sm font-medium text-fd-muted-foreground mb-3">TypeScript schema → SQL</p>
      <h1 className="font-semibold text-3xl tracking-tight mb-3">duronto</h1>
      <p className="text-fd-muted-foreground mb-8 max-w-xl leading-relaxed">
        A development-time tool for defining database schemas in TypeScript and generating
        dialect-aware SQL and type definitions. Installed as a dev dependency; nothing
        from duronto runs in your application bundle.
      </p>
      <Link
        to="/docs"
        className="px-4 py-2 rounded-lg bg-fd-primary text-fd-primary-foreground font-medium text-sm"
      >
        Documentation
      </Link>
    </div>
  );
}

export async function getConfig() {
  return {
    render: 'static',
  };
}
