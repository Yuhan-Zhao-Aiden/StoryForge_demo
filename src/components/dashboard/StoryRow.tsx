import { Badge } from "@/components/ui/badge";
import { GenerateInvite } from "./GenerateInvite";

type Story = {
  _id: string;
  title: string;
  subtitle?: string;
  status?: "Active" | "Draft" | "Published";
  lastEdited: string;
  collaborators: number;
};

const sideButton =       
  <button
    type="button"
    className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
    aria-label="More"
  >
    •••
  </button>

function StoryRow({ s, invitable }: { s: Story, invitable: boolean }) {
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
      {
        invitable ? <GenerateInvite roomId={s._id} trigger={sideButton}/>
        : sideButton
      }
    </li>
  );
}

export default StoryRow;