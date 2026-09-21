/**
 * conditionEvaluator.ts
 * Evaluates GPM Automate conditional expressions (If, Else If, While, Loop)
 * against runtime variables with full support for:
 * - Boolean variables ('True', 'False', 'true', 'false')
 * - Comparisons ($check = true, $check == true, $check = True, $check == "True", etc.)
 * - Numeric comparisons ($count > 5, $i <= 10)
 * - String comparisons ($status == "ok", $text != "error")
 */

export function evaluateGpmCondition(conditionStr: string, vars: Record<string, string>): boolean {
  if (!conditionStr || !conditionStr.trim()) return true;
  let expr = conditionStr.trim();

  // Convert single '=' to '==' if not already part of <=, >=, !=, ==
  expr = expr.replace(/([^><!=])=([^=])/g, '$1==$2');

  // Replace variables: longest variable names first to avoid partial replacements
  const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const rawK = k.startsWith('$') ? k.slice(1) : k;
    const val = (vars[k] ?? '').trim();
    const regex = new RegExp(`\\$${rawK}\\b`, 'g');

    expr = expr.replace(regex, () => {
      // If variable holds a boolean string, replace with literal boolean keyword
      if (/^(true|false)$/i.test(val)) {
        return val.toLowerCase() === 'true' ? 'true' : 'false';
      }
      // If numeric
      if (/^-?\d+(\.\d+)?$/.test(val)) {
        return val;
      }
      // Otherwise JSON-escaped string
      return JSON.stringify(val);
    });
  }

  // Any remaining unassigned $vars become empty string ""
  expr = expr.replace(/\$[a-zA-Z0-9_]+/g, '""');

  // Normalize standalone True / False literals to true / false
  expr = expr.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');

  // Handle string-to-boolean equality coercions in JavaScript
  expr = expr.replace(/"(true|True)"\s*==\s*true/g, 'true');
  expr = expr.replace(/"(false|False)"\s*==\s*false/g, 'true');
  expr = expr.replace(/"(true|True)"\s*==\s*false/g, 'false');
  expr = expr.replace(/"(false|False)"\s*==\s*true/g, 'false');
  expr = expr.replace(/true\s*==\s*"(true|True)"/g, 'true');
  expr = expr.replace(/false\s*==\s*"(false|False)"/g, 'true');

  // Handle unquoted word comparisons, e.g. "ok" == ok or ok == "ok"
  expr = expr.replace(/(===?|!==?)\s*([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match, op, word) => {
    if (['true', 'false', 'null', 'undefined', 'NaN'].includes(word)) {
      return match;
    }
    return `${op} "${word}"`;
  });
  expr = expr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(===?|!==?)/g, (match, word, op) => {
    if (['true', 'false', 'null', 'undefined', 'NaN'].includes(word)) {
      return match;
    }
    return `"${word}" ${op}`;
  });

  try {
    // eslint-disable-next-line no-new-func
    const result = new Function(`return Boolean(${expr});`)();
    return Boolean(result);
  } catch (e) {
    console.warn('Condition eval error:', expr, e);
    return false;
  }
}

export interface ExtractedHasElement {
  fullMatch: string;
  xpath: string;
  startIndex: number;
  endIndex: number;
}

/**
 * Extracts hasElement(...) calls from an expression, accurately balancing parentheses
 * and handling nested parentheses inside XPath (like normalize-space() or contains(...)).
 */
export function extractHasElements(expr: string): ExtractedHasElement[] {
  const results: ExtractedHasElement[] = [];
  const lower = expr.toLowerCase();
  let searchIdx = 0;

  while (true) {
    const foundIdx = lower.indexOf('haselement', searchIdx);
    if (foundIdx === -1) break;

    // Must be preceded by start of string, whitespace, !, (, or operator
    if (foundIdx > 0 && /[a-zA-Z0-9_]/.test(expr[foundIdx - 1])) {
      searchIdx = foundIdx + 10;
      continue;
    }

    const openParenIdx = expr.indexOf('(', foundIdx + 10);
    if (openParenIdx === -1) {
      searchIdx = foundIdx + 10;
      continue;
    }

    const between = expr.substring(foundIdx + 10, openParenIdx).trim();
    if (between.length > 0) {
      searchIdx = foundIdx + 10;
      continue;
    }

    let depth = 1;
    let inQuote: string | null = null;
    let closeParenIdx = -1;

    for (let i = openParenIdx + 1; i < expr.length; i++) {
      const char = expr[i];
      if (inQuote) {
        if (char === inQuote && expr[i - 1] !== '\\') {
          inQuote = null;
        }
      } else {
        if (char === '"' || char === "'") {
          inQuote = char;
        } else if (char === '(') {
          depth++;
        } else if (char === ')') {
          depth--;
          if (depth === 0) {
            closeParenIdx = i;
            break;
          }
        }
      }
    }

    if (closeParenIdx !== -1) {
      const fullMatch = expr.substring(foundIdx, closeParenIdx + 1);
      let xpath = expr.substring(openParenIdx + 1, closeParenIdx).trim();
      if ((xpath.startsWith('"') && xpath.endsWith('"')) || (xpath.startsWith("'") && xpath.endsWith("'"))) {
        xpath = xpath.slice(1, -1).trim();
      }
      results.push({
        fullMatch,
        xpath,
        startIndex: foundIdx,
        endIndex: closeParenIdx + 1,
      });
      searchIdx = closeParenIdx + 1;
    } else {
      searchIdx = foundIdx + 10;
    }
  }

  return results;
}

/**
 * Evaluates GPM conditions asynchronously, checking hasElement(...) against the active browser session
 * if a checkElementExists callback is provided.
 */
export async function evaluateGpmConditionAsync(
  conditionStr: string,
  vars: Record<string, string>,
  checkElementExists?: (xpath: string) => Promise<boolean>
): Promise<boolean> {
  if (!conditionStr || !conditionStr.trim()) return true;

  const hasElements = extractHasElements(conditionStr);
  if (hasElements.length === 0) {
    return evaluateGpmCondition(conditionStr, vars);
  }

  let expr = conditionStr;
  for (const item of hasElements) {
    let resolvedXPath = item.xpath;
    const keys = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const k of keys) {
      const rawK = k.startsWith('$') ? k.slice(1) : k;
      const val = vars[k] ?? '';
      resolvedXPath = resolvedXPath.replace(new RegExp(`\\$\\{${rawK}\\}`, 'g'), val);
      resolvedXPath = resolvedXPath.replace(new RegExp(`\\{\\{${rawK}\\}\\}`, 'g'), val);
      resolvedXPath = resolvedXPath.replace(new RegExp(`\\$${rawK}\\b`, 'g'), val);
    }

    let exists = false;
    if (checkElementExists) {
      try {
        exists = await checkElementExists(resolvedXPath);
      } catch (e) {
        console.warn('checkElementExists error:', e);
        exists = false;
      }
    }

    expr = expr.split(item.fullMatch).join(exists ? 'true' : 'false');
  }

  return evaluateGpmCondition(expr, vars);
}

