import type { AclFeatureDeclaration } from '@open-mercato/shared/lib/capabilities/registry'

export const features: AclFeatureDeclaration[] = [
  { id: 'communication_channels.view', title: 'View communication channels', module: 'communication_channels',
    capability: { effectClass: 'E0', reversibility: 'reversible', dataClasses: ['confidential', 'personal'] },
  },
  { id: 'communication_channels.manage', title: 'Manage communication channels', module: 'communication_channels',
    capability: { effectClass: 'E5', reversibility: 'reversible', dataClasses: ['secret'], delegable: false, note: 'Channels carry a credentialsRef — managing one decides which external account this platform speaks as.' },
  },
  { id: 'communication_channels.react', title: 'React to channel messages', module: 'communication_channels',
    capability: { effectClass: 'E3', reversibility: 'compensatable', compensation: 'communication_channels.react', externalEffect: true, dataClasses: ['confidential'], note: 'A reaction is delivered to the external platform under the tenant\'s identity. Removing it is another external act, not an undo.' },
  },
  { id: 'communication_channels.assign', title: 'Assign channel conversations', module: 'communication_channels',
    capability: { effectClass: 'E1', reversibility: 'reversible', dataClasses: ['internal'], note: 'Routing only — decides who handles a conversation, sends nothing.' },
  },
  /**
   * Per-user channel ownership (added by the email integration spec).
   *
   * Gates the "Connect my mailbox" flow on the per-user profile page. Split from
   * `communication_channels.manage` so policy can disable new linking while
   * preserving existing accounts (e.g. during a security incident response).
   * Default-granted to all roles in `setup.ts`.
   */
  { id: 'communication_channels.connect_user_channel', title: 'Connect own communication channel', module: 'communication_channels',
    capability: { effectClass: 'E5', reversibility: 'reversible', dataClasses: ['secret'], delegable: false, standingApprovable: false, note: 'Connects a person\'s own external account and stores its tokens. Never delegable: nobody should be able to connect an account on somebody else\'s behalf.' },
  },
  /**
   * Reserved for a future v2 team-oversight capability. NOT consulted in v1:
   * personal mailboxes (`CommunicationChannel.user_id` set) follow the strict
   * owner-only privacy model, so this feature grants NO cross-user channel view.
   * The admin channels list (`GET /api/communication_channels/channels`) returns
   * `user_id IS NULL` rows only; personal mailboxes surface exclusively on the
   * owner's profile page and are never exposed to admins/superadmins in v1.
   * Granted to `superadmin` + `admin` only so the inert grant is in place ahead
   * of the audited v2 oversight feature that will re-activate it.
   */
  { id: 'communication_channels.admin', title: 'Administer all communication channels (tenant-wide)', module: 'communication_channels',
    capability: { effectClass: 'E5', reversibility: 'reversible', dataClasses: ['secret', 'personal'], delegable: false, standingApprovable: false, note: 'Tenant-wide administration of every channel, including other people\'s connected accounts.' },
  },
  /**
   * Trigger the "Import history" job for a channel — fetch older messages
   * the channel never saw at bootstrap (Spec B § Phase B6). Separate from
   * `manage` so policy can gate bulk historical imports during quiet hours
   * or cost-controlled rollouts while leaving normal channel CRUD open.
   */
  { id: 'communication_channels.channel.import_history', title: 'Import channel history', module: 'communication_channels',
    capability: { effectClass: 'E2', reversibility: 'irreversible', dataClasses: ['confidential', 'personal'], note: 'Bulk import. It reads from the external platform and writes inward — nothing leaves, which is why it is not E3 — but it can pull years of other people\'s correspondence into the tenant in one act.' },
  },
  /**
   * Manage provider push delivery (Spec C — Gmail Pub/Sub push
   * subscriptions). Gates the "Re-register push" operator button and any
   * future push-status manipulation. Granted to admin + superadmin only —
   * regular users don't need to think about whether mail arrives via
   * push or polling, the system handles it.
   */
  { id: 'communication_channels.channel.push.manage', title: 'Manage push delivery', module: 'communication_channels',
    capability: { effectClass: 'E2', reversibility: 'reversible', dataClasses: ['internal'], note: 'Configures delivery. The configuration is reversible; the notifications it causes to be sent are not.' },
  },
] as const

export default features
