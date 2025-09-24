// app/(dashboard)/page.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

async function fetchJSON<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

type Room = { _id: string; title: string; visibility?: "private" | "unlisted" | "public"; updatedAt?: string };
// type RoomsPayload = { owned: Room[]; collaborating: { room: Room; role: string }[] };

// const { user } = await fetchJSON<{ user: { username?: string | null; email: string } }>("/api/me");
// const { owned, collaborating } = await fetchJSON<RoomsPayload>("/api/me/rooms");

// ---- Mock data (replace later with API/me + API/me/rooms) ----
const currentUser = {
  name: "Sarah",
  email: "sarah@example.com",
};

type Story = {
  _id: string;
  title: string;
  subtitle?: string;
  status?: "Active" | "Draft" | "Published";
  lastEdited: string; // e.g., "Jan 12, 2025"
  collaborators: number;
};

const ownedStories: Story[] = [
  {
    _id: "r1",
    title: "The Lighthouse Mystery",
    subtitle: "A dark tale of secrets hidden in an old lighthouse…",
    status: "Active",
    lastEdited: "Jan 15, 2025",
    collaborators: 4,
  },
  {
    _id: "r2",
    title: "Space Station Alpha",
    subtitle: "Sci-fi adventure aboard a distant space station…",
    status: "Draft",
    lastEdited: "Jan 12, 2025",
    collaborators: 2,
  },
  {
    _id: "r3",
    title: "Medieval Quest",
    subtitle: "Fantasy adventure in a medieval kingdom…",
    status: "Published",
    lastEdited: "Jan 10, 2025",
    collaborators: 6,
  },
];

const collabStories: Story[] = [
  {
    _id: "c1",
    title: "Neon City Blues",
    subtitle: "Cyber-noir mystery under neon skies…",
    status: "Active",
    lastEdited: "Jan 14, 2025",
    collaborators: 5,
  },
  {
    _id: "c2",
    title: "Desert of Glass",
    subtitle: "Post-apocalyptic trek across a shattered land…",
    status: "Draft",
    lastEdited: "Jan 11, 2025",
    collaborators: 3,
  },
];

// ---- Small presentational pieces ----
function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <Card className="border-muted/60">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{label}</span>
          {icon ? <span className="text-muted-foreground">{icon}</span> : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  );
}

function StoryRow({ s }: { s: Story }) {
  return (
    <li className="flex items-start justify-between rounded-lg border border-muted/60 bg-background p-3 hover:bg-muted/30">
      <div className="pr-3">
        <div className="flex items-center gap-2">
          <div className="font-medium leading-tight">{s.title}</div>
          {s.status ? (
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
              {s.status}
            </Badge>
          ) : null}
        </div>
        {s.subtitle ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">{s.subtitle}</p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          Last edited: {s.lastEdited} • {s.collaborators} collaborator{s.collaborators === 1 ? "" : "s"}
        </p>
      </div>
      {/* Kebab menu placeholder (non-functional) */}
      <button
        type="button"
        className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label="More"
      >
        •••
      </button>
    </li>
  );
}

export default function DashboardPage() {
  const totalStories = ownedStories.length + collabStories.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      {/* Top bar (title + actions) */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold leading-tight">Welcome back, {currentUser.name}</h1>
          <p className="text-sm text-muted-foreground">
            Manage your stories and join collaborative sessions
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary">Join Session</Button>
          <Button>+ Create New Story</Button>
        </div>
      </div>

      {/* Stats row (only keep Total Stories per your request) */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Stories" value={totalStories} />
        {/* Empty placeholders to visually balance the row like the mock */}
        <div className="hidden lg:block" />
        <div className="hidden lg:block" />
        <div className="hidden lg:block" />
      </div>

      {/* Recent Stories split into Owned & Collaborating */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Owned takes 2/3 width like the mock’s left pane */}
        <Card className="lg:col-span-2 border-muted/60">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Stories — Owned</CardTitle>
            <Link
              href="#"
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
            >
              View All
            </Link>
          </CardHeader>
          <CardContent>
            {ownedStories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No owned stories yet.</p>
            ) : (
              <ul className="space-y-3">
                {ownedStories.map((s) => (
                  <StoryRow key={s._id} s={s} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Right pane: Collaborating */}
        <Card className="border-muted/60">
          <CardHeader>
            <CardTitle className="text-base">Recent Stories — Collaborating</CardTitle>
          </CardHeader>
          <CardContent>
            {collabStories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No collaborations yet.</p>
            ) : (
              <ul className="space-y-3">
                {collabStories.map((s) => (
                  <StoryRow key={s._id} s={s} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}