import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase data access.
 *
 * The app uses Supabase's Postgres database through its Data API. Keep this
 * module server-only: it accepts a Supabase secret/service-role key, which must
 * never be included in browser code. Application code keeps the small `db.orm`
 * query surface it already uses; this adapter translates it to PostgREST.
 */

export interface UserRow {
  id: string;
  email: string;
  name: string | null;
  password: string | null;
  image: string | null;
  plan: string;
  referralCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReferralRow {
  id: string;
  code: string;
  referrerId: string;
  referredId: string;
  status: string;
  rewardDays: number;
  createdAt: Date;
  qualifiedAt: Date | null;
  rewardedAt: Date | null;
  referrer?: Pick<UserRow, "id" | "email" | "name"> | null;
  referred?: Pick<UserRow, "id" | "email" | "name"> | null;
}

export interface BookmarkRow {
  id: string;
  userId: string;
  tipId: string;
  createdAt: Date;
}

export interface TipRow {
  id: string;
  league: string;
  country: string;
  flag: string;
  homeTeam: string;
  awayTeam: string;
  matchTime: string;
  predictionType: string;
  prediction: string;
  odds: string;
  confidence: number;
  confidenceLabel: string;
  status: string;
  tipster: string;
  /** Stored as 0/1 to keep the existing API contract stable. */
  isPremium: number;
  analysis: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BetSlipRow {
  id: string;
  userId: string;
  tipId: string;
  createdAt: Date;
}

export interface NewsletterRow {
  id: number;
  email: string;
  subscribedAt: Date;
  active: number;
}

export interface PaymentRow {
  id: string;
  userId: string | null;
  email: string;
  amount: number;
  plan: string;
  reference: string;
  accessCode: string | null;
  status: string;
  channel: string | null;
  paidAt: Date | null;
  expiresAt: Date | null;
  metadata: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlacedBetRow {
  id: string;
  userId: string | null;
  email: string;
  betType: string;
  legs: string;
  stake: number;
  totalOdds: number;
  potentialReturn: number;
  status: string;
  result: string | null;
  settledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppSettingRow {
  key: string;
  value: string;
  updatedAt: Date;
}

export interface SharedSlipRow {
  slug: string;
  email: string | null;
  legs: string;
  stake: number | null;
  totalOdds: number | null;
  potentialReturn: number | null;
  createdAt: Date;
}

export interface DbRows {
  User: UserRow;
  Referral: ReferralRow;
  Bookmark: BookmarkRow;
  Tip: TipRow;
  BetSlip: BetSlipRow;
  Newsletter: NewsletterRow;
  Payment: PaymentRow;
  PlacedBet: PlacedBetRow;
  AppSetting: AppSettingRow;
  SharedSlip: SharedSlipRow;
}

export type DbModelName = keyof DbRows;
type RowInput<Row> = Partial<Row> | Record<string, unknown>;
type AggregateValue = number | bigint | null;

export interface AggregateSelectors {
  count(): number;
  countBigInt(): bigint;
  sum(field: string): number | null;
  min(field: string): number | null;
  max(field: string): number | null;
  avg(field: string): number | null;
}

export interface ModelQuery<Row extends object> {
  where(conditions: unknown): ModelQuery<Row>;
  select(...fields: string[]): ModelQuery<Row>;
  include(
    relation: string,
    refine?: (query: { select(...fields: string[]): unknown }) => unknown,
  ): ModelQuery<Row>;
  orderBy(refine: unknown): ModelQuery<Row>;
  limit(value: number): ModelQuery<Row>;
  offset(value: number): ModelQuery<Row>;
  first(conditions?: Record<string, unknown>): Promise<Row | null>;
  all(): Promise<Row[]>;
  create(data: RowInput<Row>): Promise<Row>;
  update(data: RowInput<Row>): Promise<Row | null>;
  delete(): Promise<Row | null>;
  upsert(input: { create: RowInput<Row>; update: RowInput<Row> }): Promise<Row | null>;
  aggregate<Result>(
    select: (aggregates: AggregateSelectors) => Result,
  ): Promise<Result>;
}

export type DbModelApi = { [Model in DbModelName]: ModelQuery<DbRows[Model]> };

export interface DbClient {
  orm: DbModelApi;
  /** Retained as a no-op for scripts that share the app's database API. */
  close(): Promise<void>;
}

type FilterOperator = "eq" | "gte" | "lte" | "in" | "like" | "isNull";

interface FilterCondition {
  kind: "filter";
  field: string;
  operator: FilterOperator;
  value?: unknown;
}

interface OrderCondition {
  kind: "order";
  field: string;
  direction: "asc" | "desc";
}

type QueryCondition = FilterCondition | OrderCondition;

interface IncludeRequest {
  relation: string;
  fields?: string[];
}

interface QueryState {
  filters: FilterCondition[];
  order: OrderCondition[];
  fields?: string[];
  includes: IncludeRequest[];
  limit?: number;
  offset?: number;
}

interface ModelMetadata {
  table: string;
  primaryKey: string;
  hasUpdatedAt?: boolean;
}

const MODELS: Record<DbModelName, ModelMetadata> = {
  User: { table: "users", primaryKey: "id", hasUpdatedAt: true },
  Referral: { table: "referrals", primaryKey: "id" },
  Bookmark: { table: "bookmarks", primaryKey: "id" },
  Tip: { table: "tips", primaryKey: "id", hasUpdatedAt: true },
  BetSlip: { table: "bet_slips", primaryKey: "id" },
  Newsletter: { table: "newsletter_subscribers", primaryKey: "id" },
  Payment: { table: "payments", primaryKey: "id", hasUpdatedAt: true },
  PlacedBet: { table: "placed_bets", primaryKey: "id", hasUpdatedAt: true },
  AppSetting: { table: "app_settings", primaryKey: "key", hasUpdatedAt: true },
  SharedSlip: { table: "shared_slips", primaryKey: "slug" },
};

const RELATIONS: Partial<
  Record<DbModelName, Record<string, { model: DbModelName; localField: string; remoteField: string }>>
> = {
  Referral: {
    referrer: { model: "User", localField: "referrerId", remoteField: "id" },
    referred: { model: "User", localField: "referredId", remoteField: "id" },
  },
};

const PAGE_SIZE = 1000;
type AnyRow = Record<string, unknown>;
type AnySupabaseClient = { from(table: string): any };

let supabaseClient: AnySupabaseClient | undefined;

function getSupabaseClient(): AnySupabaseClient {
  if (supabaseClient) return supabaseClient;

  const url =
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    "";
  const key =
    process.env.SUPABASE_SECRET_KEY?.trim() ||
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";

  if (!url) {
    throw new Error(
      "[db] Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) to your Supabase project URL.",
    );
  }
  if (!key) {
    throw new Error(
      "[db] Set SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY on the server. Do not expose this key with a NEXT_PUBLIC_ prefix.",
    );
  }

  const normalizedUrl = url.replace(/\/+$/, "");
  try {
    const parsedUrl = new URL(normalizedUrl);
    const isLocalHost = ["localhost", "127.0.0.1", "[::1]", "::1"].includes(
      parsedUrl.hostname,
    );
    if (parsedUrl.protocol !== "https:" && !(parsedUrl.protocol === "http:" && isLocalHost)) {
      throw new Error("Supabase project URLs must use HTTPS (HTTP is allowed for local development).");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid URL";
    throw new Error(`[db] Invalid Supabase project URL: ${message}`);
  }

  supabaseClient = createClient(normalizedUrl, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  }) as unknown as AnySupabaseClient;

  return supabaseClient;
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function snakeToCamel(value: string): string {
  return value.replace(/_([a-z])/g, (_match, letter: string) => letter.toUpperCase());
}

function encodeValue(value: unknown): unknown {
  return value instanceof Date ? value.toISOString() : value;
}

function encodeRow(input: RowInput<object>): AnyRow {
  const record = input as AnyRow;
  return Object.fromEntries(
    Object.entries(record)
      .filter(([, value]) => value !== undefined)
      .map(([field, value]) => [camelToSnake(field), encodeValue(value)]),
  );
}

function decodeRow(input: AnyRow): AnyRow {
  return Object.fromEntries(
    Object.entries(input).map(([field, value]) => {
      const camelField = snakeToCamel(field);
      if (value != null && camelField.endsWith("At") && typeof value === "string") {
        const date = new Date(value);
        if (!Number.isNaN(date.getTime())) return [camelField, date];
      }
      return [camelField, value];
    }),
  );
}

function makeFieldProxy(): Record<string, Record<string, (...args: any[]) => QueryCondition>> {
  return new Proxy(
    {},
    {
      get(_target, field: string) {
        return {
          eq: (value: unknown) => ({ kind: "filter", field, operator: "eq", value }),
          gte: (value: unknown) => ({ kind: "filter", field, operator: "gte", value }),
          lte: (value: unknown) => ({ kind: "filter", field, operator: "lte", value }),
          in: (value: unknown[]) => ({ kind: "filter", field, operator: "in", value }),
          like: (value: string) => ({ kind: "filter", field, operator: "like", value }),
          isNull: () => ({ kind: "filter", field, operator: "isNull" }),
          desc: () => ({ kind: "order", field, direction: "desc" }),
          asc: () => ({ kind: "order", field, direction: "asc" }),
        };
      },
    },
  );
}

function isFilterCondition(value: unknown): value is FilterCondition {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as FilterCondition).kind === "filter",
  );
}

function isOrderCondition(value: unknown): value is OrderCondition {
  return Boolean(
    value &&
      typeof value === "object" &&
      (value as OrderCondition).kind === "order",
  );
}

function collectFilters(input: unknown): FilterCondition[] {
  if (!input) return [];
  if (typeof input === "function") {
    const result = (input as (fields: unknown) => unknown)(makeFieldProxy());
    const values = Array.isArray(result) ? result : [result];
    return values.filter(isFilterCondition);
  }
  if (typeof input !== "object") return [];

  return Object.entries(input as AnyRow)
    .filter(([, value]) => value !== undefined)
    .map(([field, value]) => ({
      kind: "filter" as const,
      field,
      operator: "eq" as const,
      value,
    }));
}

function collectOrders(input: unknown): OrderCondition[] {
  const callbacks = Array.isArray(input) ? input : [input];
  return callbacks.flatMap((callback) => {
    const result = typeof callback === "function"
      ? (callback as (fields: unknown) => unknown)(makeFieldProxy())
      : callback;
    const values = Array.isArray(result) ? result : [result];
    return values.filter(isOrderCondition);
  });
}

function applyFilters(query: any, filters: FilterCondition[]): any {
  let nextQuery = query;
  for (const filter of filters) {
    const field = camelToSnake(filter.field);
    const value = encodeValue(filter.value);
    switch (filter.operator) {
      case "eq":
        nextQuery = value === null
          ? nextQuery.is(field, null)
          : nextQuery.eq(field, value);
        break;
      case "gte":
        nextQuery = nextQuery.gte(field, value);
        break;
      case "lte":
        nextQuery = nextQuery.lte(field, value);
        break;
      case "in":
        nextQuery = nextQuery.in(field, (filter.value as unknown[]).map(encodeValue));
        break;
      case "like":
        // The old SQLite lookup was case-insensitive; ilike preserves that
        // behavior for legacy mixed-case email addresses.
        nextQuery = nextQuery.ilike(field, value);
        break;
      case "isNull":
        nextQuery = nextQuery.is(field, null);
        break;
    }
  }
  return nextQuery;
}

function applyOrder(query: any, order: OrderCondition[]): any {
  let nextQuery = query;
  for (const clause of order) {
    nextQuery = nextQuery.order(camelToSnake(clause.field), {
      ascending: clause.direction === "asc",
    });
  }
  return nextQuery;
}

function readErrorCode(error: unknown): string | undefined {
  if (error && typeof error === "object" && "code" in error) {
    return String((error as { code: unknown }).code);
  }
  return undefined;
}

function throwIfError(error: unknown, model: DbModelName, action: string): void {
  if (!error) return;
  const details = error as { message?: string; code?: string };
  const wrapped = new Error(
    `[db] Supabase ${action} on ${MODELS[model].table} failed: ${details.message ?? "unknown error"}`,
  );
  if (details.code) Object.assign(wrapped, { code: details.code });
  Object.assign(wrapped, { cause: error });
  throw wrapped;
}

function projectRow(row: AnyRow, fields?: string[], includes: IncludeRequest[] = []): AnyRow {
  if (!fields) return row;
  const projected: AnyRow = Object.fromEntries(fields.map((field) => [field, row[field]]));
  for (const include of includes) projected[include.relation] = row[include.relation] ?? null;
  return projected;
}

async function readRawRows(
  model: DbModelName,
  state: QueryState,
  fields?: string[],
): Promise<AnyRow[]> {
  const metadata = MODELS[model];
  const selectedFields = fields?.length
    ? fields.map(camelToSnake).join(",")
    : "*";
  const startAt = Math.max(0, state.offset ?? 0);
  const requestedLimit = state.limit == null ? Number.POSITIVE_INFINITY : Math.max(0, state.limit);
  if (requestedLimit === 0) return [];

  const rows: AnyRow[] = [];
  let offset = startAt;
  let remaining = requestedLimit;

  while (remaining > 0) {
    const pageSize = Math.min(PAGE_SIZE, remaining);
    let query = getSupabaseClient().from(metadata.table).select(selectedFields);
    query = applyFilters(query, state.filters);
    query = applyOrder(query, state.order);
    query = query.range(offset, offset + pageSize - 1);

    const { data, error } = await query;
    throwIfError(error, model, "select");

    const page = (Array.isArray(data) ? data : data ? [data] : []).map(decodeRow);
    rows.push(...page);
    if (page.length < pageSize) break;

    offset += page.length;
    remaining -= page.length;
  }

  return rows;
}

async function readRows<K extends DbModelName>(model: K, state: QueryState): Promise<AnyRow[]> {
  const includes = state.includes;
  const requiredRelationFields = (RELATIONS[model] ? includes : []).map((include) => {
    const relation = RELATIONS[model]?.[include.relation];
    if (!relation) {
      throw new Error(`[db] Unknown ${model} relation "${include.relation}".`);
    }
    return relation.localField;
  });
  const queryFields = state.fields
    ? Array.from(new Set([...state.fields, ...requiredRelationFields]))
    : undefined;
  let rows = await readRawRows(model, state, queryFields);

  for (const include of includes) {
    const relation = RELATIONS[model]?.[include.relation];
    if (!relation) {
      throw new Error(`[db] Unknown ${model} relation "${include.relation}".`);
    }

    const ids = Array.from(
      new Set(
        rows
          .map((row) => row[relation.localField])
          .filter((value): value is string => typeof value === "string"),
      ),
    );
    const relatedFields = include.fields
      ? Array.from(new Set([...include.fields, relation.remoteField]))
      : undefined;
    const relatedRows = ids.length
      ? await readRawRows(
          relation.model,
          {
            filters: [{
              kind: "filter",
              field: relation.remoteField,
              operator: "in",
              value: ids,
            }],
            order: [],
            includes: [],
          },
          relatedFields,
        )
      : [];
    const relatedById = new Map(
      relatedRows.map((row) => [row[relation.remoteField], projectRow(row, include.fields)]),
    );

    rows = rows.map((row) => ({
      ...row,
      [include.relation]: relatedById.get(row[relation.localField]) ?? null,
    }));
  }

  return rows.map((row) => projectRow(row, state.fields, includes));
}

async function countRows(model: DbModelName, state: QueryState): Promise<number> {
  const metadata = MODELS[model];
  let query = getSupabaseClient()
    .from(metadata.table)
    .select(camelToSnake(metadata.primaryKey), { count: "exact", head: true });
  query = applyFilters(query, state.filters);
  const { count, error } = await query;
  throwIfError(error, model, "count");
  return count ?? 0;
}

interface AggregateExpression {
  __dbAggregate: "count" | "countBigInt" | "sum" | "min" | "max" | "avg";
  field?: string;
}

function isAggregateExpression(value: unknown): value is AggregateExpression {
  return Boolean(
    value &&
      typeof value === "object" &&
      "__dbAggregate" in value,
  );
}

async function aggregateRows<Result>(
  model: DbModelName,
  state: QueryState,
  select: (aggregates: AggregateSelectors) => Result,
): Promise<Result> {
  const expression = (
    name: AggregateExpression["__dbAggregate"],
    field?: string,
  ): AggregateExpression => ({ __dbAggregate: name, field });
  const aggregates: AggregateSelectors = {
    count: () => expression("count") as unknown as number,
    countBigInt: () => expression("countBigInt") as unknown as bigint,
    sum: (field) => expression("sum", field) as unknown as number,
    min: (field) => expression("min", field) as unknown as number,
    max: (field) => expression("max", field) as unknown as number,
    avg: (field) => expression("avg", field) as unknown as number,
  };
  const specification = select(aggregates) as Record<string, unknown>;
  const entries = Object.entries(specification).filter(([, value]) =>
    isAggregateExpression(value),
  ) as Array<[string, AggregateExpression]>;

  if (entries.length === 0) return specification as Result;

  const needsCount = entries.some(([, item]) =>
    item.__dbAggregate === "count" || item.__dbAggregate === "countBigInt",
  );
  const valueFields = Array.from(
    new Set(
      entries
        .filter(([, item]) => item.__dbAggregate !== "count" && item.__dbAggregate !== "countBigInt")
        .map(([, item]) => item.field)
        .filter((field): field is string => Boolean(field)),
    ),
  );
  const [count, rows] = await Promise.all([
    needsCount ? countRows(model, state) : Promise.resolve(0),
    valueFields.length ? readRawRows(model, state, valueFields) : Promise.resolve([] as AnyRow[]),
  ]);

  const result: Record<string, AggregateValue> = {};
  for (const [key, item] of entries) {
    if (item.__dbAggregate === "count") {
      result[key] = count;
    } else if (item.__dbAggregate === "countBigInt") {
      result[key] = BigInt(count);
    } else {
      const values = rows
        .map((row) => Number(row[item.field ?? ""]))
        .filter((value) => Number.isFinite(value));
      if (values.length === 0) {
        result[key] = null;
      } else if (item.__dbAggregate === "sum") {
        result[key] = values.reduce((total, value) => total + value, 0);
      } else if (item.__dbAggregate === "min") {
        result[key] = Math.min(...values);
      } else if (item.__dbAggregate === "max") {
        result[key] = Math.max(...values);
      } else {
        result[key] = values.reduce((total, value) => total + value, 0) / values.length;
      }
    }
  }

  return { ...specification, ...result } as Result;
}

function initialState(): QueryState {
  return { filters: [], order: [], includes: [] };
}

function createQuery<K extends DbModelName>(model: K, state: QueryState): ModelQuery<DbRows[K]> {
  const clone = (patch: Partial<QueryState>): ModelQuery<DbRows[K]> =>
    createQuery(model, {
      filters: [...state.filters, ...(patch.filters ?? [])],
      order: [...state.order, ...(patch.order ?? [])],
      fields: patch.fields ?? state.fields,
      includes: [...state.includes, ...(patch.includes ?? [])],
      limit: patch.limit ?? state.limit,
      offset: patch.offset ?? state.offset,
    });

  const api: ModelQuery<DbRows[K]> = {
    where(conditions) {
      return clone({ filters: collectFilters(conditions) });
    },
    select(...fields) {
      return clone({ fields });
    },
    include(relation, refine) {
      let selectedFields: string[] | undefined;
      if (refine) {
        const branch = {
          select(...fields: string[]) {
            selectedFields = fields;
            return branch;
          },
        };
        refine(branch);
      }
      return clone({ includes: [{ relation, fields: selectedFields }] });
    },
    orderBy(refine) {
      return clone({ order: collectOrders(refine) });
    },
    limit(value) {
      return clone({ limit: Math.max(0, value) });
    },
    offset(value) {
      return clone({ offset: Math.max(0, value) });
    },
    async first(conditions) {
      const filters = conditions ? collectFilters(conditions) : [];
      const limit = state.limit == null ? 1 : Math.min(1, state.limit);
      const [row] = await readRows(model, {
        ...state,
        filters: [...state.filters, ...filters],
        limit,
      });
      return (row as unknown as DbRows[K] | undefined) ?? null;
    },
    async all() {
      return (await readRows(model, state)) as unknown as DbRows[K][];
    },
    async create(data) {
      const columns = state.fields?.length
        ? state.fields.map(camelToSnake).join(",")
        : "*";
      const payload = encodeRow(data);
      const { data: created, error } = await getSupabaseClient()
        .from(MODELS[model].table)
        .insert(payload)
        .select(columns)
        .single();
      throwIfError(error, model, "insert");
      return projectRow(decodeRow(created as AnyRow), state.fields, []) as unknown as DbRows[K];
    },
    async update(data) {
      const payload = encodeRow(data);
      if (MODELS[model].hasUpdatedAt && !("updated_at" in payload)) {
        payload.updated_at = new Date().toISOString();
      }
      if (Object.keys(payload).length === 0) return this.first();

      let query = getSupabaseClient()
        .from(MODELS[model].table)
        .update(payload)
        .select("*");
      query = applyFilters(query, state.filters);
      const { data: updatedRows, error } = await query;
      throwIfError(error, model, "update");
      const [row] = Array.isArray(updatedRows) ? updatedRows.map(decodeRow) : [];
      return row ? (row as unknown as DbRows[K]) : null;
    },
    async delete() {
      let query = getSupabaseClient()
        .from(MODELS[model].table)
        .delete()
        .select("*");
      query = applyFilters(query, state.filters);
      const { data: deletedRows, error } = await query;
      throwIfError(error, model, "delete");
      const [row] = Array.isArray(deletedRows) ? deletedRows.map(decodeRow) : [];
      return row ? (row as unknown as DbRows[K]) : null;
    },
    async upsert(input) {
      const existing = await this.first();
      if (existing) return this.update(input.update);

      try {
        return await this.create(input.create);
      } catch (error) {
        // If another request inserted the same unique row after our read, retry
        // the update branch rather than losing that write to a 23505 conflict.
        if (readErrorCode(error) === "23505" && state.filters.length > 0) {
          return this.update(input.update);
        }
        throw error;
      }
    },
    async aggregate(select) {
      return aggregateRows(model, state, select);
    },
  };

  return api;
}

const modelApis = Object.fromEntries(
  (Object.keys(MODELS) as DbModelName[]).map((model) => [model, createQuery(model, initialState())]),
) as DbModelApi;

export const db: DbClient = {
  orm: modelApis,
  async close() {
    // Supabase's HTTP client has no open database handle to close.
  },
};
