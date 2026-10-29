// Colunas e chaves de tenancy compartilhadas pelas tabelas operacionais.
// Toda tabela operacional carrega organization_id + unit_id, e as FKs entre elas são compostas
// (id, organization_id, unit_id): o banco recusa ligar registros de escolas diferentes.
import { foreignKey, unique, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";
import { schoolUnit } from "@/modules/tenancy/schema";

export const tenantColumns = () => ({
  organizationId: uuid().notNull(),
  unitId: uuid().notNull(),
});

type TenantCols = { organizationId: AnyPgColumn; unitId: AnyPgColumn };

/** FK da tabela para a unidade (que já garante a organização). */
export const unitFk = (name: string, t: TenantCols) =>
  foreignKey({
    name,
    columns: [t.unitId, t.organizationId],
    foreignColumns: [schoolUnit.id, schoolUnit.organizationId],
  });

/** Alvo de FKs compostas vindas de outras tabelas da mesma escola. */
export const tenantKey = (name: string, t: TenantCols & { id: AnyPgColumn }) =>
  unique(name).on(t.id, t.organizationId, t.unitId);

/** FK composta para outra tabela operacional da mesma organização e unidade. */
export const sameTenantFk = (
  name: string,
  column: AnyPgColumn,
  t: TenantCols,
  parent: TenantCols & { id: AnyPgColumn },
) =>
  foreignKey({
    name,
    columns: [column, t.organizationId, t.unitId],
    foreignColumns: [parent.id, parent.organizationId, parent.unitId],
  });
