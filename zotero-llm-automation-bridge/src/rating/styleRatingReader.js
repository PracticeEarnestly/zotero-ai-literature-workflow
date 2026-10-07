Bridge.identity = item => `${item.libraryID}:${item.key}`;
Bridge.readRating = item => {
  const values = String(item.getField("extra") || "").split(/\r?\n/)
    .map(line => line.match(/^\s*rate\s*:\s*([0-5])\s*$/i)).filter(Boolean);
  // Conflicting duplicate fields are ambiguous and must not create a trigger.
  return values.length === 1 ? Number(values[0][1]) : 0;
};
Bridge.isPaper = item => !!item && item.isRegularItem() && !item.deleted;
