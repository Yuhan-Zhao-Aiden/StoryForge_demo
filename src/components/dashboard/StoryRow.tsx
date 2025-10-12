import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { StoryMenu } from "./DropDownMenu";

type Story = {
  _id: string;
  title: string;
  subtitle?: string;
  status?: "Active" | "Draft" | "Published";
  lastEdited: string;
  collaborators: number;
  role?: "owner" | "editor" | "viewer";
};

function capitalize(word?: string) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function StoryRow({ s, invitable }: { s: Story; invitable: boolean }) {
  const href = `/rooms/${s._id}/editor`;
  const roleLabel = s.role && s.role !== "owner" ? capitalize(s.role) : null;

  return (
    <li className="flex items-start justify-between rounded-lg border border-muted/60 bg-background p-3 hover:bg-muted/30">
      <Link
        href={href}
        className="group flex flex-1 flex-col pr-3 focus:outline-none"
      >
        <div className="flex items-center gap-2">
          <div className="font-medium leading-tight group-hover:underline">
            {s.title}
          </div>
          {s.status ? (
            <Badge variant="secondary" className="h-5 px-2 text-[11px]">
              {s.status}
            </Badge>
          ) : null}
          {roleLabel ? (
            <Badge variant="outline" className="h-5 px-2 text-[11px]">
              {roleLabel}
            </Badge>
          ) : null}
        </div>
        {s.subtitle ? (
          <p className="mt-0.5 line-clamp-1 text-sm text-muted-foreground">
            {s.subtitle}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted-foreground">
          Last edited: {s.lastEdited} • {s.collaborators} collaborator
          {s.collaborators === 1 ? "" : "s"}
        </p>
      </Link>
      {invitable ? (
        <StoryMenu room={s} />
      ) : (
        <button
          type="button"
          className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="More"
        >
          •••
        </button>
      )}
    </li>
  );
}

export default StoryRow;
