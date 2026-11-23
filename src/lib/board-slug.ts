export function boardHandleBase(name: string) {
  const base = name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50).replace(/-$/, "");
  return base.length < 2 ? (base + "-board").slice(0, 50) : base;
}

export function uniqueBoardHandle(name: string, used: Iterable<string>) {
  const base = boardHandleBase(name);
  const taken = new Set(used);
  let handle = base;
  for (let suffix = 2; taken.has(handle); suffix++) handle = `${base}-${suffix}`;
  return handle;
}
