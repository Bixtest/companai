export type AttachmentSource = 'bytes' | 'signed-url' | 'text' | 'metadata-only'

export interface AiResolvedAttachmentPart {
  attachmentId: string
  fileName: string
  mediaType: string
  source: AttachmentSource
  textContent?: string | null
  url?: string | null
  data?: Uint8Array | string | null
}

export interface AiUiPart {
  componentId: string
  props: Record<string, unknown>
}

export interface AiChatRequestContext {
  tenantId: string | null
  organizationId: string | null
  userId: string
  features: string[]
  isSuperAdmin: boolean
  /**
   * The person a machine actor acts on behalf of (S-02).
   *
   * `userId` here is the acting principal's subject (`apikey:<id>` for a key).
   * This is the human behind it, from `auth.userId` at the auth boundary — the
   * input to the resolver's responsible-user intersection. Optional: a person
   * acting as themselves carries none, and a context that has not resolved it
   * must not have one invented for it (see `tool-authority.ts`).
   */
  onBehalfOfUserId?: string | null
}
