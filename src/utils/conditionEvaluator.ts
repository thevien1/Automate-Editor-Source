/**
 * conditionEvaluator.ts
 * Evaluates GPM Automate conditional expressions (If, Else If, While, Loop)
 * against runtime variables according to official specification:
 * https://docs.gpmautomate.com/huong-dan-cac-action/cac-block/huong-dan-viet-dieu-kien
 * 
 * Supported features:
 * - Arithmetic comparisons: >, <, >=, <= ($count > 5, $i <= 10)
 * - Logic comparisons: = (single equal), != ($status = "admin", 3 = 3, "a" != "b")
 * - String contains operators:
 *     "ABCD" contains "AB" (true)
 *     "ABCD" !contains "AB" (false)
 *     !"ABCD" contains "AB" (false)
 *     contains "B" (standalone empty check: true if empty, false if has data)
 * - Element checks:
 *     hasElement(XPATH) / has_element(XPATH)
 *     !hasElement(XPATH) / !has_element(XPATH)
 *     With quotes or unquoted XPaths containing brackets, single/double quotes, contains()
 * - Compound conditions: &&, ||, parentheses ()
 * - Boolean literals and coercions: True, False, true, false, "true" = true, etc.
 */

/**
 * Transforms GPM contains operators into valid JavaScript expressions.
 */
export function transformContainsOperators(expr: string): string {
  let s = expr;

  const operandPattern = `(?:"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|[^\\s&|()]+)`;

  // 1. Infix !contains: "A" !contains "B"
  const infixNotContainsRegex = new RegExp(`(${operandPattern})\\s+!contains\\s+(${operandPattern})`, 'gi');
  s = s.replace(infixNotContainsRegex, (_, a, b) => {
    return `(!String(${a}).includes(String(${b})))`;
  });

  // 2. Negated first operand with contains: !"A" contains "B"
  const negatedPrefixContainsRegex = new RegExp(`!\\s*(${operandPattern})\\s+contains\\s+(${operandPattern})`, 'gi');
  s = s.replace(negatedPrefixContainsRegex, (_, a, b) => {
    return `(!String(${a}).includes(String(${b})))`;
  });

  // 3. Infix contains: "A" contains "B"
  const infixContainsRegex = new RegExp(`(${operandPattern})\\s+contains\\s+(${operandPattern})`, 'gi');
  s = s.replace(infixContainsRegex, (_, a, b) => {
    return `(String(${a}).includes(String(${b})))`;
  });

  // 4. Standalone !contains operand: !contains "foo" (checks if NOT empty / has data)
  const standaloneNotContainsRegex = new RegExp(`(^|&&|\\|\\||[(!])\\s*!contains\\s+(${operandPattern})`, 'gi');
  s = s.replace(standaloneNotContainsRegex, (_, prefix, target) => {
    return `${prefix} (Boolean(String(${target}).trim()))`;
  });

  // 5. Standalone contains operand: contains "foo" (checks if empty: true if empty, false if has data)
  const standaloneContainsRegex = new RegExp(`(^|&&|\\|\\||[(!])\\s*contains\\s+(${operandPattern})`, 'gi');
  s = s.replace(standaloneContainsRegex, (_, prefix, target) => {
    return `${prefix} (!String(${target}).trim())`;
  });

  return s;
}

export function evaluateGpmCondition(conditionStr: string, vars: Record<string, string>): boolean {
  if (!conditionStr || !conditionStr.trim()) return true;
  let expr = conditionStr.trim();

  // Protect string literals before converting '=' so that '=' inside strings is untouched
  const strings: string[] = [];
  expr = expr.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, (match) => {
    strings.push(match);
    return `__STR_LITERAL_${strings.length - 1}__`;
  });

  // Convert single '=' to '==' if not already part of <=, >=, !=, ==
  expr = expr.replace(/([^><!=])=([^=])/g, '$1==$2');
  expr = expr.replace(/(^|&&|\|\||\()\s*=\s*/g, '$1 == ');

  // Restore string literals
  expr = expr.replace(/__STR_LITERAL_(\d+)__/g, (_, idx) => strings[Number(idx)]);

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

  // Handle contains / !contains operators
  expr = transformContainsOperators(expr);

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
 * Extracts hasElement(...) and has_element(...) calls from an expression,
 * accurately balancing parentheses and handling nested parentheses inside XPath
 * (like normalize-space(), contains(...), etc.).
 */
export function extractHasElements(expr: string): ExtractedHasElement[] {
  const results: ExtractedHasElement[] = [];
  const lower = expr.toLowerCase();
  let searchIdx = 0;

  while (true) {
    let fnName = '';
    let foundIdx = lower.indexOf('haselement', searchIdx);
    if (foundIdx === -1) {
      foundIdx = lower.indexOf('has_element', searchIdx);
      if (foundIdx !== -1) fnName = 'has_element';
    } else {
      const altIdx = lower.indexOf('has_element', searchIdx);
      if (altIdx !== -1 && altIdx < foundIdx) {
        foundIdx = altIdx;
        fnName = 'has_element';
      } else {
        fnName = 'haselement';
      }
    }

    if (foundIdx === -1) break;

    // Must be preceded by start of string, whitespace, !, (, or operator
    if (foundIdx > 0 && /[a-zA-Z0-9_]/.test(expr[foundIdx - 1])) {
      searchIdx = foundIdx + fnName.length;
      continue;
    }

    const openParenIdx = expr.indexOf('(', foundIdx + fnName.length);
    if (openParenIdx === -1) {
      searchIdx = foundIdx + fnName.length;
      continue;
    }

    const between = expr.substring(foundIdx + fnName.length, openParenIdx).trim();
    if (between.length > 0) {
      searchIdx = foundIdx + fnName.length;
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
      searchIdx = foundIdx + fnName.length;
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
