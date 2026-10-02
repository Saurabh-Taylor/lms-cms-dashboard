import {
  AI_TOOL_DESCRIPTIONS,
  AiCreateAnnouncementSchema,
  AiEnrollLearnersSchema,
  AiSendAnnouncementSchema,
  AiUpdateAnnouncementSchema,
} from "@microshala/contracts";

/**
 * Client-side declarations for Niyamak's approval-gated write tools.
 *
 * InterruptManager only marks a tool-approval interrupt resolvable when the
 * client's `useChat({tools})` contains the tool — matching name,
 * `needsApproval: true`, and a matching `hashSchemaInput(inputSchema)` digest.
 * The hash covers `inputSchema` alone (the converted JSON schema — field
 * `.describe()` text included; the tool-level `description` is not hashed).
 * Sharing the contract zod objects verbatim keeps the digest identical to
 * the backend catalog by construction — schema drift silently re-breaks
 * approvals.
 *
 * No `execute` — these exist solely so an approval card can stage a
 * resolvable interrupt and submit the resume batch. Execution stays
 * server-side behind the pending-approval record.
 */
export const NIYAMAK_WRITE_TOOLS = [
  {
    __toolSide: "client",
    name: "enroll_learners",
    description: AI_TOOL_DESCRIPTIONS.enroll_learners,
    inputSchema: AiEnrollLearnersSchema,
    needsApproval: true,
  },
  {
    __toolSide: "client",
    name: "create_announcement",
    description: AI_TOOL_DESCRIPTIONS.create_announcement,
    inputSchema: AiCreateAnnouncementSchema,
    needsApproval: true,
  },
  {
    __toolSide: "client",
    name: "update_announcement",
    description: AI_TOOL_DESCRIPTIONS.update_announcement,
    inputSchema: AiUpdateAnnouncementSchema,
    needsApproval: true,
  },
  {
    __toolSide: "client",
    name: "send_announcement",
    description: AI_TOOL_DESCRIPTIONS.send_announcement,
    inputSchema: AiSendAnnouncementSchema,
    needsApproval: true,
  },
] as const;
