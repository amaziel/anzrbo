import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/carte")({
  component: CarteRedirect,
  head: () => ({ meta: [
    { title: "Portail imprimeur — Cartes ANZRBO" },
    { name: "description", content: "Accès au portail d'impression des cartes officielles des membres ANZRBO." },
    { property: "og:title", content: "Portail imprimeur — Cartes ANZRBO" },
    { property: "og:description", content: "Accès au portail d'impression des cartes officielles des membres ANZRBO." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex,nofollow" },
  ]}),
});

function CarteRedirect() {
  return <Navigate to="/print" replace />;
}
