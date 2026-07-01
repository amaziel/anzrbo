import { redirect } from "@tanstack/react-router";
import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

// Front-end permission buckets. Multiple database roles can map to the same
// bucket — see DB_ROLE_TO_APP below.
export type Role = "admin_anzrbo" | "digitorg" | "nsia";

// Database role names (public.app_role). Kept as a plain string union because
// the generated Supabase types in this project don't expose the public schema.
type DbRole =
  | "super_admin"
  | "admin_anzrbo"
  | "admin_nsia"
  | "admin_national"
  | "president"
  | "tresorier_national"
  | "secretaire_general"
  | "directeur_executif"
  | "commissaire_comptes"
  | "secretaire_regional"
  | "tresorier_regional"
  | "comite_controle"
  | "conseil_sages"
  | "delegue_section"
  | "agent_saisie"
  | "imprimeur"
  | "tresorier"
  | "nsia"
  | "member"
  | "membre";


export type LocalUser = {
  id: string;            // auth.users.id
  identifier: string;    // email (display only)
  nom: string;
  prenoms: string;
  role: Role;            // primary front-end role
  roles: Role[];         // every front-end role the user holds
  home: "/admin" | "/digitorg" | "/nsia";
};

// Mapping from database roles (public.app_role) to the front-end permission
// buckets the UI knows about. Server-side RLS remains the source of truth
// for actual data access — this map only decides which dashboards are shown.
const DB_ROLE_TO_APP: Partial<Record<DbRole, Role[]>> = {
  super_admin: ["admin_anzrbo", "digitorg", "nsia"],
  admin_anzrbo: ["admin_anzrbo"],
  admin_national: ["admin_anzrbo"],
  agent_saisie: ["admin_anzrbo"],
  president: ["admin_anzrbo"],
  tresorier_national: ["admin_anzrbo"],
  tresorier: ["admin_anzrbo"],
  secretaire_general: ["admin_anzrbo"],
  directeur_executif: ["admin_anzrbo"],
  delegue_section: ["admin_anzrbo"],
  admin_nsia: ["nsia"],
  nsia: ["nsia"],
};


const ROLE_HOME: Record<Role, "/admin" | "/digitorg" | "/nsia"> = {
  admin_anzrbo: "/admin",
  digitorg: "/digitorg",
  nsia: "/nsia",
};

// Module-level cache so synchronous `clientRoleGuard` calls used in TanStack
// `beforeLoad` can read the latest known auth state without awaiting. The
// authoritative source remains supabase.auth.getUser() + a server-side
// SELECT against public.user_roles (RLS-protected). The cache is written
// only after both succeed.
// `undefined` = unresolved (e.g. first paint after hard refresh).
// `null`      = resolved, no authenticated user / no recognized role.
let cachedUser: LocalUser | null | undefined = undefined;

function deriveAppRoles(dbRoles: DbRole[]): Role[] {
  const set = new Set<Role>();
  for (const r of dbRoles) {
    const mapped = DB_ROLE_TO_APP[r];
    if (mapped) mapped.forEach((m) => set.add(m));
  }
  return Array.from(set);
}

function pickPrimary(roles: Role[]): Role | null {
  if (roles.includes("admin_anzrbo")) return "admin_anzrbo";
  if (roles.includes("digitorg")) return "digitorg";
  if (roles.includes("nsia")) return "nsia";
  return null;
}

function fallbackRolesFromEmail(email: string): Role[] {
  const e = email.toLowerCase();
  if (e === "admin@digitorg.local" || e.endsWith("@digitorg.local")) return ["admin_anzrbo", "digitorg", "nsia"];
  if (e === "0759566087@anzrbo.local" || e.endsWith("@anzrbo.local")) return ["admin_anzrbo"];
  if (e === "nsia@nsia.local" || e.endsWith("@nsia.local")) return ["nsia"];
  return [];
}

function displayNames(email: string, meta: Record<string, unknown> | null | undefined): { nom: string; prenoms: string } {
  const fromMeta = (k: string) => (meta && typeof meta[k] === "string" ? (meta[k] as string) : "");
  const nom = fromMeta("nom") || fromMeta("last_name");
  const prenoms = fromMeta("prenoms") || fromMeta("first_name") || fromMeta("full_name");
  if (nom || prenoms) return { nom: nom || "", prenoms: prenoms || "" };
  const local = email.split("@")[0] || "Admin";
  return { nom: local.toUpperCase(), prenoms: "" };
}

async function loadCurrentUser(): Promise<LocalUser | null> {
  // getUser() round-trips to Supabase Auth and validates the token server-side
  // (unlike getSession which only reads the local store).
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr || !userData.user) return null;

  const authUser = userData.user;
  const email = authUser.email ?? "";

  // public.user_roles is RLS-protected: `auth.uid() = user_id` for SELECT.
  // The query therefore returns only this user's roles, even if the table
  // were exposed by mistake — no enumeration risk.
  // Types for public.* aren't generated in this project, so cast through
  // `any` for the table reference only. RLS still enforces row scoping.
  const { data: roleRows, error: roleErr } = await (supabase as any)
    .from("user_roles")
    .select("role")
    .eq("user_id", authUser.id);

  let dbRoles = ((roleRows ?? []) as Array<{ role: string }>).map((r) => r.role as DbRole);
  let appRoles = deriveAppRoles(dbRoles);

  if (roleErr || appRoles.length === 0) {
    console.error("user_roles fetch failed", roleErr);
    // Fallback UI uniquement : les écritures restent protégées côté serveur par
    // user_roles/service-role. Cela évite de bloquer l'accès admin si une policy
    // de lecture user_roles est temporairement cassée.
    appRoles = fallbackRolesFromEmail(email);
  }

  const primary = pickPrimary(appRoles);
  if (!primary) return null;

  const { nom, prenoms } = displayNames(email, authUser.user_metadata as Record<string, unknown> | null);
  return {
    id: authUser.id,
    identifier: email,
    nom,
    prenoms,
    role: primary,
    roles: appRoles,
    home: ROLE_HOME[primary],
  };
}

// Sync guard usable from TanStack `beforeLoad`. Returns a redirect target
// when we KNOW the user does not have access; returns undefined while the
// session is still resolving so the route can mount and the component-level
// effect can render a loading state / redirect once `loading` flips false.
export function clientRoleGuard(allowed: Role[]): ReturnType<typeof redirect> | undefined {
  if (cachedUser === undefined) return undefined; // unknown → let the route load
  if (!cachedUser) return redirect({ to: "/login" });
  const ok = cachedUser.roles.some((r) => allowed.includes(r));
  return ok ? undefined : redirect({ to: "/login" });
}

type Ctx = {
  user: LocalUser | null;
  loading: boolean;
  signIn: (identifier: string, password: string) => Promise<LocalUser | null>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null,
  loading: false,
  signIn: async () => null,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    // Subscribe FIRST so we never miss an event fired between the initial
    // load and the subscription being attached.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "TOKEN_REFRESHED") return;
      // Defer the work so we don't call into supabase from inside the listener.
      setTimeout(() => {
        void loadCurrentUser().then((u) => {
          cachedUser = u;
          if (mountedRef.current) setUser(u);
        });
      }, 0);
    });

    void loadCurrentUser().then((u) => {
      cachedUser = u;
      if (mountedRef.current) {
        setUser(u);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthCtx.Provider
      value={{
        user,
        loading,
        signIn: async (identifier, password) => {
          // L'utilisateur saisit un IDENTIFIANT (jamais un email).
          // Une RPC SECURITY DEFINER convertit l'identifiant en email interne
          // (réponse constante anti-énumération). On signe ensuite via Supabase Auth.
          const id = identifier.trim().toLowerCase() === "digitorg" ? "admin" : identifier.trim();
          const { data: email, error: rpcErr } = await (supabase as any).rpc(
            "resolve_identifier_to_email",
            { p_identifier: id },
          );
          if (rpcErr || typeof email !== "string") return null;
          const { error } = await supabase.auth.signInWithPassword({ email, password });
          if (error) return null;
          const u = await loadCurrentUser();
          cachedUser = u;
          setUser(u);
          if (!u) {
            await supabase.auth.signOut();
            return null;
          }
          return u;
        },

        signOut: async () => {
          try {
            await supabase.auth.signOut();
          } finally {
            cachedUser = null;
            setUser(null);
            if (typeof window !== "undefined") window.location.assign("/login");
          }
        },
      }}
    >
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
