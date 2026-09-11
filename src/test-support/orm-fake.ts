/**
 * Minimal in-memory stand-in for the Prisma Next ORM surface used by the
 * unit tests. It implements just enough of `db.orm.<Model>` — `where`, `select`,
 * `include`, `orderBy`, `limit`/`offset`, `first`, `all`, `create`, `update`,
 * `delete` and `aggregate` — to drive the lib helpers without a database.
 *
 * Keep this in step with `src/prisma/db.ts`: if a helper starts using another
 * operator or terminal verb, add it here rather than weakening the test.
 */

type Row = Record<string, unknown>;

type Cond =
  | { kind: "cmp"; field: string; op: "eq" | "gte" | "lte" | "in" | "like" | "isNull"; value: unknown }
  | { kind: "order"; field: string; dir: "asc" | "desc" };

export interface ModelStore {
  rows: Row[];
  /** relation name → resolver returning the related row(s) */
  relations?: Record<string, (row: Row) => unknown>;
  pk?: string;
}

function fieldProxy(): unknown {
  return new Proxy(
    {},
    {
      get(_target, prop: string) {
        const field = prop;
        return {
          eq: (value: unknown) => ({ kind: "cmp", field, op: "eq", value }),
          gte: (value: unknown) => ({ kind: "cmp", field, op: "gte", value }),
          lte: (value: unknown) => ({ kind: "cmp", field, op: "lte", value }),
          in: (value: unknown[]) => ({ kind: "cmp", field, op: "in", value }),
          like: (value: string) => ({ kind: "cmp", field, op: "like", value }),
          isNull: () => ({ kind: "cmp", field, op: "isNull", value: null }),
          desc: () => ({ kind: "order", field, dir: "desc" }),
          asc: () => ({ kind: "order", field, dir: "asc" }),
        };
      },
    },
  );
}

function matches(row: Row, conds: Cond[]): boolean {
  return conds.every((cond) => {
    if (cond.kind !== "cmp") return true;
    const value = row[cond.field];
    switch (cond.op) {
      case "eq":
        return value === cond.value;
      case "gte":
        return value != null && (value as number) >= (cond.value as number);
      case "lte":
        return value != null && (value as number) <= (cond.value as number);
      case "in":
        return (cond.value as unknown[]).includes(value);
      case "like":
        return (
          typeof value === "string" &&
          value.toLowerCase().includes(String(cond.value).replace(/%/g, "").toLowerCase())
        );
      case "isNull":
        return value === null || value === undefined;
      default:
        return true;
    }
  });
}

function collectConds(arg: unknown): Cond[] {
  if (!arg) return [];
  if (typeof arg === "function") {
    const result = (arg as (proxy: unknown) => unknown)(fieldProxy());
    return (Array.isArray(result) ? result : [result]) as Cond[];
  }
  return Object.entries(arg as Row).map(([field, value]) => ({
    kind: "cmp",
    field,
    op: "eq",
    value,
  }));
}

interface State {
  conds: Cond[];
  order: Cond[];
  limit?: number;
  offset?: number;
  fields?: string[];
  includes: Array<[string, unknown]>;
}

function makeCollection(store: ModelStore, initial?: Partial<State>) {
  const state: State = {
    conds: initial?.conds ?? [],
    order: initial?.order ?? [],
    limit: initial?.limit,
    offset: initial?.offset,
    fields: initial?.fields,
    includes: initial?.includes ?? [],
  };

  const matching = () => store.rows.filter((row) => matches(row, state.conds));

  const project = (row: Row): Row => {
    const base: Row = state.fields
      ? Object.fromEntries(state.fields.map((f) => [f, row[f]]))
      : { ...row };
    for (const [name] of state.includes) {
      const resolver = store.relations?.[name];
      if (resolver) base[name] = resolver(row);
    }
    return base;
  };

  const sorted = () => {
    const rows = [...matching()];
    if (state.order.length > 0) {
      rows.sort((a, b) => {
        for (const cond of state.order) {
          if (cond.kind !== "order") continue;
          const av = a[cond.field] as number | string | Date;
          const bv = b[cond.field] as number | string | Date;
          if (av === bv) continue;
          const cmp = av > bv ? 1 : -1;
          return cond.dir === "desc" ? -cmp : cmp;
        }
        return 0;
      });
    }
    const start = state.offset ?? 0;
    return state.limit != null ? rows.slice(start, start + state.limit) : rows.slice(start);
  };

  const clone = (patch: Partial<State>) =>
    makeCollection(store, {
      conds: [...state.conds, ...(patch.conds ?? [])],
      order: [...state.order, ...(patch.order ?? [])],
      limit: patch.limit ?? state.limit,
      offset: patch.offset ?? state.offset,
      fields: patch.fields ?? state.fields,
      includes: [...state.includes, ...(patch.includes ?? [])],
    }) as Collection;

  const collection = {
    where(arg: unknown) {
      return clone({ conds: collectConds(arg) });
    },
    select(...fields: string[]) {
      return clone({ fields });
    },
    include(name: string, refine?: (branch: unknown) => unknown) {
      if (refine) refine(makeBranch());
      return clone({ includes: [[name, refine]] });
    },
    orderBy(refine: unknown) {
      const list = Array.isArray(refine) ? refine : [refine];
      const order = list.flatMap((fn) => (fn as (p: unknown) => unknown)(fieldProxy()) as Cond);
      return clone({ order: Array.isArray(order) ? order : [order] });
    },
    limit(n: number) {
      return clone({ limit: n });
    },
    offset(n: number) {
      return clone({ offset: n });
    },
    async first(pk?: Row) {
      const scoped = pk ? clone({ conds: collectConds(pk) }) : collection;
      const [row] = scoped._sorted();
      return row ? project(row) : null;
    },
    async all() {
      return sorted().map(project);
    },
    async create(data: Row) {
      const row = { ...data };
      if (row[store.pk ?? "id"] === undefined) {
        row[store.pk ?? "id"] = `auto_${store.rows.length + 1}`;
      }
      store.rows.push(row);
      return { ...row };
    },
    async update(data: Row) {
      const rows = matching();
      for (const row of rows) Object.assign(row, data);
      return rows.length > 0 ? { ...rows[0] } : null;
    },
    async delete() {
      const rows = matching();
      for (const row of rows) {
        const index = store.rows.indexOf(row);
        if (index >= 0) store.rows.splice(index, 1);
      }
      return rows.length > 0 ? { ...rows[0] } : null;
    },
    async aggregate(spec: (a: Record<string, (...args: never[]) => unknown>) => Row) {
      const rows = matching();
      const api = {
        count: () => rows.length,
        countBigInt: () => BigInt(rows.length),
        sum: (field: string) => rows.reduce((acc, r) => acc + Number(r[field] ?? 0), 0),
        min: (field: string) => Math.min(...rows.map((r) => Number(r[field]))),
        max: (field: string) => Math.max(...rows.map((r) => Number(r[field]))),
        avg: (field: string) =>
          rows.length === 0 ? null : rows.reduce((a, r) => a + Number(r[field] ?? 0), 0) / rows.length,
      };
      return spec(api as never);
    },
    _sorted: sorted,
  };

  return collection;
}

function makeBranch(): unknown {
  const noop = () => makeBranch();
  return { select: noop, orderBy: noop, limit: noop, offset: noop, where: noop, include: noop };
}

type Collection = ReturnType<typeof makeCollection>;

/** Build a `db` object shaped like the Prisma Next client. */
export function makeOrmDb(stores: Record<string, ModelStore>) {
  const orm: Record<string, Collection> = {};
  for (const [model, store] of Object.entries(stores)) {
    orm[model] = makeCollection(store);
  }
  return { orm };
}
