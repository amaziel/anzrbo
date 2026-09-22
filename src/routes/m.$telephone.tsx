import { Navigate, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/m/$telephone")({
  component: LegacyMemberRedirect,
  head: () => ({
    meta: [
      { title: "Vérification membre — ANZRBO" },
      { name: "description", content: "Redirection vers la fiche publique officielle du membre ANZRBO." },
      { property: "og:title", content: "Vérification membre — ANZRBO" },
      { property: "og:description", content: "Redirection vers la fiche publique officielle du membre ANZRBO." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function LegacyMemberRedirect() {
  const { telephone } = Route.useParams();
  return <Navigate to="/verifier/$telephone" params={{ telephone }} replace />;
}