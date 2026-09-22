/**
 * variableResolver.ts
 * Unified variable resolution engine supporting:
 * - Simple variables: $var, {{var}}, ${var}, var
 * - Array indexing: $arr[0], $arr[$i], $arr[$loopIndex], arr[$index], {{arr[0]}}, {{arr[$loopIndex]}}, ${arr[$i]}
 * - Array properties: $arr.length, {{arr.length}}, $arr.Count, {{arr.Count}}, $arr_count
 * - Count functions: Count($arr), Count(arr)
 */

export function resolveVariableString(str: string, varsMap: Record<string, string>): string {
  if (!str) return '';
  let res = String(str);

  // 1. Unwrap {{arr[idx]}} or ${arr[idx]} so brackets can be cleanly parsed
  res = res.replace(/\{\{\s*(\$?[a-zA-Z0-9_]+\[[^\]]+\])\s*\}\}/g, '$1');
  res = res.replace(/\$\{\s*(\$?[a-zA-Z0-9_]+\[[^\]]+\])\s*\}/g, '$1');

  // 2. Count function helper: Count($arr) or Count(arr)
  res = res.replace(/Count\(\s*\$?([a-zA-Z0-9_]+)\s*\)/gi, (_, arrName) => {
    const raw = varsMap[`$${arrName}`] ?? varsMap[arrName];
    if (!raw) return '0';
    try {
      const parsed = typeof raw === 'string' && (raw.startsWith('[') || raw.startsWith('{')) ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) return String(parsed.length);
    } catch {}
    if (typeof raw === 'string' && raw.includes('\n')) {
      return String(raw.split(/\r?\n/).filter(l => l.length > 0).length);
    }
    return '1';
  });

  // 3. Resolve array indexing: $arr[$loopIndex], $arr[0], arr[$i], etc.
  res = res.replace(/\$?([a-zA-Z0-9_]+)\[([^\]]+)\]/g, (match, arrName, rawIdx) => {
    let idxStr = rawIdx.trim();
    if (idxStr.startsWith('$')) {
      idxStr = varsMap[idxStr] ?? varsMap[idxStr.replace(/^\$/, '')] ?? idxStr;
    } else if (varsMap[idxStr] !== undefined) {
      idxStr = varsMap[idxStr];
    } else if (varsMap[`$${idxStr}`] !== undefined) {
      idxStr = varsMap[`$${idxStr}`];
    }

    const idx = parseInt(idxStr, 10);
    if (isNaN(idx)) return match;

    // Direct key lookup
    const directKey1 = `${arrName}[${idx}]`;
    const directKey2 = `$${arrName}[${idx}]`;
    if (varsMap[directKey1] !== undefined) return varsMap[directKey1];
    if (varsMap[directKey2] !== undefined) return varsMap[directKey2];

    // Array parse fallback
    const rawArray = varsMap[`$${arrName}`] ?? varsMap[arrName];
    if (rawArray !== undefined) {
      if (Array.isArray(rawArray)) {
        return rawArray[idx] !== undefined ? String(rawArray[idx]) : '';
      }
      if (typeof rawArray === 'string') {
        const trimmed = rawArray.trim();
        if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
          try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) {
              return parsed[idx] !== undefined ? String(parsed[idx]) : '';
            }
          } catch (e) {}
        }
        const lines = rawArray.split(/\r?\n/);
        if (idx >= 0 && idx < lines.length) {
          return lines[idx];
        }
      }
    }

    return '';
  });

  // 4. Resolve normal variable references: ${varName}, {{varName}} and $varName
  const entries = Object.entries(varsMap).sort((a, b) => b[0].length - a[0].length);
  for (const [k, v] of entries) {
    if (k.includes('[') || k.includes(']')) continue;
    const rawK = k.startsWith('$') ? k.slice(1) : k;
    res = res.replace(new RegExp(`\\$\\{${rawK}\\}`, 'g'), v);
    res = res.replace(new RegExp(`\\{\\{${rawK}\\}\\}`, 'g'), v);
    res = res.replace(new RegExp(`\\$${rawK}(?![a-zA-Z0-9_])`, 'g'), v);
  }

  return res;
}
