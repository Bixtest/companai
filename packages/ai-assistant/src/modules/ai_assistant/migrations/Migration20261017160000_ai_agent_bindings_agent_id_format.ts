import { Migration } from '@mikro-orm/migrations'

/**
 * `CC-103` — `agent_id` is normalised at the data layer.
 *
 * The lowercase pattern `/^[a-z0-9_]+\.[a-z0-9_]+$/` existed only in the HTTP
 * route's path schema (`api/ai/agents/[agentId]/bindings/route.ts:17`). The
 * table stores `agent_id text` with no constraint, and its two partial unique
 * indexes compare the column exactly — so a seed, a SQL fix or any future writer
 * could insert `CRM.Sales` beside `crm.sales`, and `findBinding` would never see
 * the second row. Two spellings of one agent is the one-truth defect `SR-39`
 * exists to catch, expressed in the data.
 *
 * A CHECK makes the second spelling **unrepresentable**, which is stronger than
 * normalising on read: the donor's move is to constrain the normalised form, not
 * to remember to normalise (`zulip/zerver/migrations/0295_case_insensitive_email_indexes.py:11-17`
 * constrains `Upper(email)` rather than trusting every writer).
 *
 * The `lower(agent_id)` index is the lookup path a case-insensitive read would
 * need if one is ever added. It is not used today.
 *
 * **If this migration fails, it is reporting a real defect**: the error names a
 * row whose `agent_id` is not in canonical form. Deliberately not `NOT VALID` —
 * that would leave the defect in place while claiming the constraint exists.
 */
export class Migration20261017160000_ai_agent_bindings_agent_id_format extends Migration {
  override async up(): Promise<void> {
    this.addSql(`
      alter table "ai_agent_bindings"
        add constraint "ai_agent_bindings_agent_id_format_ck"
        check ("agent_id" ~ '^[a-z0-9_]+\\.[a-z0-9_]+$');
    `)
    this.addSql(`
      create index "ai_agent_bindings_tenant_agent_lower_idx"
        on "ai_agent_bindings" ("tenant_id", lower("agent_id"));
    `)
  }

  override async down(): Promise<void> {
    this.addSql(`drop index if exists "ai_agent_bindings_tenant_agent_lower_idx";`)
    this.addSql(`
      alter table "ai_agent_bindings"
        drop constraint if exists "ai_agent_bindings_agent_id_format_ck";
    `)
  }
}
