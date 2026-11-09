"use client";
import {ActionButton} from "@/components/ui/action-button";

import * as React from "react";
import {WorkspaceIdentityFields} from "@/components/feedback/workspace-identity-fields";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { XIcon } from "@/components/icons";
import { GlobeIcon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Field, FieldLabel } from "@/components/ui/field";
import { useProject } from "@/components/feedback/project-provider";
import { WorkspaceSync } from "@/components/feedback/workspace-sync";
import { createWorkspaceAction } from "@/server/actions/workspaces";

const slugify = (value: string) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function OnboardingView({
  initialReady = false,
}: {
  initialReady?: boolean;
}) {
  const { project, projects } = useProject();
  const router = useRouter();
  const [website, setWebsite] = React.useState("");
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [edited, setEdited] = React.useState(false);
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const form = React.useRef<HTMLFormElement>(null);

  if (initialReady)
    return (
      <main className="flex min-h-svh items-center justify-center bg-background px-6">
        <div className="max-w-md">
          <h1 className="text-2xl font-semibold">Your workspace is ready.</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Create your first feedback board inside {project.name}.
          </p>
          <Button className="mt-6" render={<Link href="/dashboard/boards" />}>
            Open workspace
          </Button>
        </div>
      </main>
    );

  return (
    <main className="relative flex min-h-svh items-center justify-center bg-background px-6 py-20">
      <WorkspaceSync />
      <Button
        aria-label="Cancel workspace creation"
        variant="ghost"
        size="icon"
        className="absolute right-5 top-5 rounded-md text-muted-foreground"
        render={<Link href="/" />}
      >
        <XIcon className="size-4" />
      </Button>
      <div className="w-full max-w-[400px]">
        <h1 className="text-2xl font-semibold leading-8 tracking-[-0.14px]">
          Create your workspace
        </h1>
        <p className="mt-2 max-w-sm text-sm leading-5 text-muted-foreground">
          Set up a space to collect and organize feedback.
        </p>
        <form
          ref={form}
          className="mt-10 flex flex-col gap-6"
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              form.current?.requestSubmit();
            }
          }}
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");

            if (!name.trim() || !slug) return;

            if (projects.some((item) => item.slug === slug)) {
              setError(
                "This handle is already used by one of your workspaces.",
              );
              return;
            }

            let normalized = "";
            if (website.trim()) {
              try {
                const parsed = new URL(
                  website.includes("://") ? website : "https://" + website,
                );
                if (
                  !["https:", "http:"].includes(parsed.protocol) ||
                  !parsed.hostname.includes(".")
                )
                  throw Error();
                normalized = parsed.href;
              } catch {
                setError("Enter a valid website, such as yoursite.com.");
                return;
              }
            }

            setSubmitting(true);
            let result: Awaited<ReturnType<typeof createWorkspaceAction>>;
            try {
              result = await createWorkspaceAction({
                name: name.trim(),
                handle: slug,
                website: normalized || undefined,
              });
            } catch {
              setSubmitting(false);
              setError("The workspace could not be created. Try again.");
              return;
            }
            setSubmitting(false);

            if (!result.ok) {
              const fieldError = result.error.fieldErrors
                ? Object.values(result.error.fieldErrors)[0]?.[0]
                : undefined;
              setError(fieldError ?? result.error.message);
              return;
            }

            router.push("/dashboard/boards");
          }}
        >
          <Field>
            <FieldLabel htmlFor="workspace-website">
              Website{" "}
              <span className="text-xs font-medium text-muted-foreground">
                (optional)
              </span>
            </FieldLabel>
            <InputGroup>
              <InputGroupAddon>
                <GlobeIcon />
              </InputGroupAddon>
              <InputGroupInput
                id="workspace-website"
                autoComplete="url"
                placeholder="yoursite.com"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
              />
            </InputGroup>
          </Field>
          <WorkspaceIdentityFields name={name} handle={slug} onNameChange={value=>{setName(value);if(!edited)setSlug(slugify(value).slice(0,40).replace(/-$/,""));setError("");}} onHandleChange={value=>{setEdited(true);setSlug(value);setError("");}}/>
          {error && (
            <p role="alert" className="text-xs text-destructive-foreground">
              {error}
            </p>
          )}
          <ActionButton
            state={submitting?"pending":error?"error":"idle"}
            pendingLabel="Creating workspace…"
            retryLabel="Retry creating workspace"
            type="submit"
            className="mt-2 h-9 self-start rounded-2xl px-3.5 text-sm"
            disabled={name.trim().length<2 || slug.length<5 || submitting}
          >
            Create workspace
            <kbd className="ml-1.5 rounded bg-primary-foreground/15 px-1 py-0.5 text-[13px]">
              ⌘ ↵
            </kbd>
          </ActionButton>
        </form>
      </div>
    </main>
  );
}
