const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

export const diffObjects = (beforeObj = {}, afterObj = {}) => {
  const diffs = [];
  const keys = new Set([...Object.keys(beforeObj || {}), ...Object.keys(afterObj || {})]);

  for (const key of keys) {
    const beforeValue = beforeObj?.[key];
    const afterValue = afterObj?.[key];

    if (isObject(beforeValue) && isObject(afterValue)) {
      const nestedDiffs = diffObjects(beforeValue, afterValue).map((entry) => ({
        ...entry,
        path: `${key}.${entry.path}`
      }));
      diffs.push(...nestedDiffs);
      continue;
    }

    const beforeSerialized = JSON.stringify(beforeValue);
    const afterSerialized = JSON.stringify(afterValue);
    if (beforeSerialized !== afterSerialized) {
      diffs.push({ path: key, before: beforeValue, after: afterValue });
    }
  }

  return diffs;
};
