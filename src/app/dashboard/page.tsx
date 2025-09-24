// app/(dashboard)/page.tsx
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Icons
import { FaBook } from "react-icons/fa";
import { VscVmActive } from "react-icons/vsc";
import { FaUserGroup } from "react-icons/fa6";
import { FaChartLine } from "react-icons/fa6";

import StatCard from "@/components/dashboard/StatCard";
import StoryRow from "@/components/dashboard/StoryRow";

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





export default function DashboardPage() {
  const totalStories = ownedStories.length + collabStories.length;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-6">
      {/* Top bar (title + actions) */}
      <div className="mb-16 flex flex-wrap items-center justify-between gap-3">
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

      {/* Stats row (only keep Total Stories ) */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Stories" value={totalStories} icon={<FaBook />}/>
        <StatCard label="Active Sessions" value={totalStories} icon={<VscVmActive />}/>
        <StatCard label="Collaborators" value={10} icon={< FaUserGroup />}/>
        <StatCard label="This month" value={24} icon={<FaChartLine />}/>
        {/* Empty placeholders to visually balance the row like the mock */}
        {/* <div className="hidden lg:block" />
        <div className="hidden lg:block" />
        <div className="hidden lg:block" /> */}
      </div>

      {/* Recent Stories split into Owned & Collaborating */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Owned takes 2/3 width like the mock’s left pane */}
        <Card className="lg:col-span-2 border-muted/60">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Stories — Your Stories</CardTitle>
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