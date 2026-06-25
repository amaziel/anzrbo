import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  Navigate,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";

import { AuthProvider } from "@/lib/auth";
import { initClientDiagnostics } from "@/lib/client-diagnostics";
import { registerServiceWorker } from "@/lib/register-sw";
import appCss from "../styles.css?url";

function NotFoundComponent() {
  const location = useLocation();
  if (location.pathname === "/index") return <Navigate to="/" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page introuvable</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Cette page n'existe pas ou a été déplacée.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Cette page n'a pas chargé
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Une erreur est survenue. Vous pouvez réessayer ou revenir à l'accueil.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Réessayer
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Retour à l'accueil
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "ANZRBO — Entraide et solidarité N'Zipris à Bonon" },
      { name: "description", content: "Plateforme officielle ANZRBO : entraide, assistance au décès et solidarité — sous-préfecture de Bonon, Côte d'Ivoire." },
      { name: "author", content: "DigitOrg" },
      { property: "og:site_name", content: "ANZRBO" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "ANZRBO — Entraide et solidarité N'Zipris à Bonon" },
      { name: "twitter:title", content: "ANZRBO — Entraide et solidarité N'Zipris à Bonon" },
      { property: "og:description", content: "Plateforme officielle ANZRBO : entraide, assistance au décès et solidarité — sous-préfecture de Bonon, Côte d'Ivoire." },
      { name: "twitter:description", content: "Plateforme officielle ANZRBO : entraide, assistance au décès et solidarité — sous-préfecture de Bonon, Côte d'Ivoire." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/c78cfc05-3776-49ce-b5a7-4f36fd177cfb" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/c78cfc05-3776-49ce-b5a7-4f36fd177cfb" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "ANZRBO — Association des N'Zipris Résidents à Bonon",
          url: "https://anzrbo1.lovable.app",
          description:
            "Association d'entraide et d'assistance au décès des N'Zipris résidents à Bonon, Côte d'Ivoire.",
          areaServed: { "@type": "Place", name: "Bonon, Côte d'Ivoire" },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    initClientDiagnostics();
    registerServiceWorker();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    </QueryClientProvider>
  );
}
