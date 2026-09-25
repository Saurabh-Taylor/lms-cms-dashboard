"use client";

import * as React from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import type { EmailTemplateRow } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fmtRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

export function TemplatesClient({ templates }: { templates: EmailTemplateRow[] }) {
  const router = useRouter();
  const [sel, setSel] = React.useState(templates[0]?.id ?? 0);
  const t = templates.find((x) => x.id === sel);
  const [subject, setSubject] = React.useState(t?.subject ?? "");
  const [body, setBody] = React.useState(t?.body ?? "");

  const [prevSel, setPrevSel] = React.useState(sel);
  if (sel !== prevSel) {
    setPrevSel(sel);
    setSubject(t?.subject ?? "");
    setBody(t?.body ?? "");
  }

  const save = useMutation({
    mutationFn: () =>
      api(`/api/admin/email-templates/${sel}`, {
        method: "PATCH", body: JSON.stringify({ subject, body }),
      }),
    onSuccess: () => { toast.success("Template saved"); router.refresh(); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Card className="h-fit">
        <ScrollArea className="max-h-[60vh]">
          <ul className="p-2">
            {templates.map((tpl) => (
              <li key={tpl.id}>
                <button
                  onClick={() => setSel(tpl.id)}
                  className={cn(
                    "w-full rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                    sel === tpl.id && "bg-muted font-medium"
                  )}
                >
                  {tpl.name}
                  <span className="block text-xs font-normal text-muted-foreground">
                    {fmtRelative(tpl.updatedAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </Card>

      {t && (
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">{t.name}</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Body</Label>
              <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
              <p className="text-xs text-muted-foreground">Variables: {"{{user_name}}"}, {"{{platform_name}}"}, {"{{course_title}}"}</p>
            </div>
            <div className="flex justify-end">
              <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                {save.isPending ? "Saving…" : "Save template"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
