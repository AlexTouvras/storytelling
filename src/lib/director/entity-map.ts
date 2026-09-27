/**
 * Semantic identity across representations.
 *
 * The map knows that `loan-724` exists, what it stands for in the evidence, and
 * which representation is currently carrying it. It never stores geometry:
 * positions belong to whichever renderer is drawing the entity and are asked
 * for through an anchor lookup, so the map cannot go stale when a renderer
 * moves something.
 */

export type Representation =
  /** A mark in a canvas data visual. */
  | "data-point"
  /** An artboard in a Rive illustration. */
  | "illustration"
  /** An SVG element. */
  | "diagram-node";

export type Entity = {
  id: string;
  /** What kind of thing this is, e.g. "loan" or "household". */
  semanticType: string;
  /** Pointer into the evidence, e.g. "sim:book-field/seed-42/loan/724". */
  dataReference: string;
  representation: Representation;
  /** Whether the reader is being pointed at it. */
  highlighted: boolean;
  state: Record<string, unknown>;
};

type Patch = Partial<Omit<Entity, "id">>;

const GEOMETRY_KEYS = ["x", "y", "width", "height", "left", "top", "anchor"];

export class EntityMap {
  private readonly entities = new Map<string, Entity>();
  private readonly listeners = new Set<() => void>();
  private version = 0;

  register(entity: Entity): void {
    assertNoGeometry(entity.state);
    this.entities.set(entity.id, { ...entity, state: { ...entity.state } });
    this.emit();
  }

  get(id: string): Entity | undefined {
    return this.entities.get(id);
  }

  has(id: string): boolean {
    return this.entities.has(id);
  }

  /** Returns true if anything changed. */
  update(id: string, patch: Patch): boolean {
    const current = this.entities.get(id);
    if (!current) throw new Error(`no entity ${id}`);
    if (patch.state) assertNoGeometry(patch.state);
    const next: Entity = {
      ...current,
      ...patch,
      state: patch.state ? { ...current.state, ...patch.state } : current.state,
    };
    if (sameEntity(current, next)) return false;
    this.entities.set(id, next);
    this.emit();
    return true;
  }

  all(): Entity[] {
    return [...this.entities.values()];
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  /** Changes on every mutation; lets React read the map as an external store. */
  snapshot(): number {
    return this.version;
  }

  private emit() {
    this.version++;
    for (const fn of this.listeners) fn();
  }
}

function assertNoGeometry(state: Record<string, unknown>) {
  for (const key of GEOMETRY_KEYS) {
    if (key in state) {
      throw new Error(
        `entity state may not carry "${key}": geometry belongs to the renderer and is read through an anchor`,
      );
    }
  }
}

function sameEntity(a: Entity, b: Entity): boolean {
  if (
    a.semanticType !== b.semanticType ||
    a.dataReference !== b.dataReference ||
    a.representation !== b.representation ||
    a.highlighted !== b.highlighted
  ) {
    return false;
  }
  const keys = new Set([...Object.keys(a.state), ...Object.keys(b.state)]);
  for (const k of keys) if (a.state[k] !== b.state[k]) return false;
  return true;
}
