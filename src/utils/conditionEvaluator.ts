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

/**
 * Transforms GPM string operators (contains, startsWith, endsWith) into valid JavaScript expressions.
 */
export function transformStringOperators(expr: string): string {
  let s = transformContainsOperators(expr);

  const operandPattern = `(?:"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|[^\\s&|()]+)`;

  // Infix !startsWith: "A" !startsWith "B"
  const infixNotStartsRegex = new RegExp(`(${operandPattern})\\s+!startsWith\\s+(${operandPattern})`, 'gi');
  s = s.replace(infixNotStartsRegex, (_, a, b) => `(!String(${a}).startsWith(String(${b})))`);

  // Negated prefix with startsWith: !"A" startsWith "B"
  const negatedPrefixStartsRegex = new RegExp(`!\\s*(${operandPattern})\\s+startsWith\\s+(${operandPattern})`, 'gi');
  s = s.replace(negatedPrefixStartsRegex, (_, a, b) => `(!String(${a}).startsWith(String(${b})))`);

  // Infix startsWith: "A" startsWith "B"
  const infixStartsRegex = new RegExp(`(${operandPattern})\\s+startsWith\\s+(${operandPattern})`, 'gi');
  s = s.replace(infixStartsRegex, (_, a, b) => `(String(${a}).startsWith(String(${b})))`);

  // Infix !endsWith: "A" !endsWith "B"
  const infixNotEndsRegex = new RegExp(`(${operandPattern})\\s+!endsWith\\s+(${operandPattern})`, 'gi');
  s = s.replace(infixNotEndsRegex, (_, a, b) => `(!String(${a}).endsWith(String(${b})))`);

  // Negated prefix with endsWith: !"A" endsWith "B"
  const negatedPrefixEndsRegex = new RegExp(`!\\s*(${operandPattern})\\s+endsWith\\s+(${operandPattern})`, 'gi');
  s = s.replace(negatedPrefixEndsRegex, (_, a, b) => `(!String(${a}).endsWith(String(${b})))`);

  // Infix endsWith: "A" endsWith "B"
  const infixEndsRegex = new RegExp(`(${operandPattern})\\s+endsWith\\s+(${operandPattern})`, 'gi');
  s = s.replace(infixEndsRegex, (_, a, b) => `(String(${a}).endsWith(String(${b})))`);

  return s;
}

export function evaluateGpmCondition(conditionStr: string, vars: Record<string, string>): boolean {
  if (!conditionStr || !conditionStr.trim()) return true;
  let expr = conditionStr.trim();

  // Strip outer brackets if the user entered the condition wrapped in [ ... ]
  if (expr.startsWith('[') && expr.endsWith(']')) {
    let depth = 0;
    let isOuter = true;
    for (let i = 0; i < expr.length - 1; i++) {
      if (expr[i] === '[') depth++;
      else if (expr[i] === ']') depth--;
      if (depth === 0) {
        isOuter = false;
        break;
      }
    }
    if (isOuter && depth === 1) {
      expr = expr.slice(1, -1).trim();
    }
  }

  // Unwrap {{...}} and ${...}
  expr = expr.replace(/\{\{\s*([^{}]+)\s*\}\}/g, '$1');
  expr = expr.replace(/\$\{\s*([^}]+)\s*\}/g, '$$1');

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

  const formatValForCondition = (val: any): string => {
    if (val === undefined || val === null) return '""';
    if (Array.isArray(val)) val = val.length;
    const str = String(val).trim();
    if (/^(true|false)$/i.test(str)) return str.toLowerCase() === 'true' ? 'true' : 'false';
    if (/^-?\d+(\.\d+)?$/.test(str)) return str;
    return JSON.stringify(str);
  };

  const extractNestedProp = (raw: any, propPath: string): any => {
    if (raw === undefined || raw === null) return undefined;
    let obj: any = raw;
    if (typeof raw === 'string') {
      const trimmed = raw.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try { obj = JSON.parse(trimmed); } catch (e) { return undefined; }
      } else {
        return undefined;
      }
    }
    if (typeof obj !== 'object' || obj === null) return undefined;

    const segments = propPath.split('.');
    let cur = obj;
    for (let i = 0; i < segments.length; i++) {
      if (cur === undefined || cur === null) return undefined;
      const seg = segments[i].trim();
      const bracketMatch = seg.match(/^([a-zA-Z0-9_]+)\[([^\]]+)\]$/);
      if (bracketMatch) {
        const key = bracketMatch[1];
        let idxStr = bracketMatch[2].trim();
        if (idxStr.startsWith('$')) {
          idxStr = vars[idxStr] ?? vars[idxStr.replace(/^\$/, '')] ?? idxStr;
        } else if (vars[idxStr] !== undefined) {
          idxStr = vars[idxStr];
        } else if (vars[`$${idxStr}`] !== undefined) {
          idxStr = vars[`$${idxStr}`];
        }
        const idx = parseInt(idxStr, 10);
        cur = cur[key];
        if (Array.isArray(cur) && !isNaN(idx)) {
          cur = cur[idx];
        } else {
          return undefined;
        }
      } else {
        if ((seg === 'length' || seg.toLowerCase() === 'count') && Array.isArray(cur)) {
          cur = cur.length;
        } else {
          cur = cur[seg];
        }
      }
    }
    return cur;
  };

  // 1. Resolve JSON bracket property: $var['prop'] or $var["prop"]
  expr = expr.replace(/(\$)?([a-zA-Z0-9_]+)\[['"]([a-zA-Z0-9_]+)['"]\]/g, (match, hasDollar, varName, propKey) => {
    const directKey1 = `$${varName}[${propKey}]`;
    const directKey2 = `${varName}[${propKey}]`;
    if (vars[directKey1] !== undefined) return formatValForCondition(vars[directKey1]);
    if (vars[directKey2] !== undefined) return formatValForCondition(vars[directKey2]);

    const raw = vars[`$${varName}`] ?? vars[varName];
    if (raw !== undefined) {
      const val = extractNestedProp(raw, propKey);
      return formatValForCondition(val);
    }
    return match;
  });

  // 2. Resolve JSON dot property and nested access: $var.prop, $var.prop.sub, $var.prop[0], $var.prop[$i]
  expr = expr.replace(/(\$)?([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+(?:\[[^\]]+\])?(?:\.[a-zA-Z0-9_]+)*)/g, (match, hasDollar, varName, propPath) => {
    const fullKey1 = `$${varName}.${propPath}`;
    const fullKey2 = `${varName}.${propPath}`;
    if (vars[fullKey1] !== undefined) return formatValForCondition(vars[fullKey1]);
    if (vars[fullKey2] !== undefined) return formatValForCondition(vars[fullKey2]);

    const raw = vars[`$${varName}`] ?? vars[varName];
    if (raw !== undefined) {
      const val = extractNestedProp(raw, propPath);
      return formatValForCondition(val);
    }
    return match;
  });

  // 3. Resolve array indexing in conditions: $arr[0], $arr[$i], $arr[$loopIndex], arr[0], etc.
  expr = expr.replace(/\$?([a-zA-Z0-9_]+)\[([^\]]+)\]/g, (match, arrName, rawIdx) => {
    let idxStr = rawIdx.trim();
    if (idxStr.startsWith('$')) {
      idxStr = vars[idxStr] ?? vars[idxStr.replace(/^\$/, '')] ?? idxStr;
    } else if (vars[idxStr] !== undefined) {
      idxStr = vars[idxStr];
    } else if (vars[`$${idxStr}`] !== undefined) {
      idxStr = vars[`$${idxStr}`];
    }

    const idx = parseInt(idxStr, 10);
    if (isNaN(idx)) return match;

    const directKey1 = `${arrName}[${idx}]`;
    const directKey2 = `$${arrName}[${idx}]`;
    let val: string | undefined = undefined;
    if (vars[directKey1] !== undefined) val = vars[directKey1];
    else if (vars[directKey2] !== undefined) val = vars[directKey2];
    else {
      const rawArray = vars[`$${arrName}`] ?? vars[arrName];
      if (rawArray !== undefined) {
        if (Array.isArray(rawArray)) {
          val = rawArray[idx] !== undefined ? String(rawArray[idx]) : '';
        } else if (typeof rawArray === 'string') {
          const trimmed = rawArray.trim();
          if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                val = parsed[idx] !== undefined ? String(parsed[idx]) : '';
              }
            } catch (e) {}
          }
          if (val === undefined) {
            const lines = rawArray.split(/\r?\n/);
            if (idx >= 0 && idx < lines.length) {
              val = lines[idx];
            }
          }
        }
      }
    }

    if (val === undefined) return '""';
    return formatValForCondition(val);
  });

  // 4. Replace standalone variables: longest variable names first to avoid partial replacements
  const keys = Object.keys(vars).filter((k) => !k.includes('[') && !k.includes(']')).sort((a, b) => b.length - a.length);
  for (const k of keys) {
    const rawK = k.startsWith('$') ? k.slice(1) : k;
    const val = (vars[k] ?? '').trim();

    // 4a. If user wrapped the variable in quotes like "$myVar" or '$myVar', replace the entire quoted string with JSON.stringify
    const quotedRegex = new RegExp(`(["'])\\$${rawK}\\b\\1`, 'g');
    expr = expr.replace(quotedRegex, () => {
      return JSON.stringify(val);
    });

    // 4b. Otherwise replace unquoted $myVar
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
  expr = expr.replace(/(["'])\$[a-zA-Z0-9_]+\1/g, '""');
  expr = expr.replace(/\$[a-zA-Z0-9_]+/g, '""');

  // Normalize standalone True / False literals to true / false
  expr = expr.replace(/\bTrue\b/g, 'true').replace(/\bFalse\b/g, 'false');

  // Handle contains / !contains / startsWith / endsWith operators
  expr = transformStringOperators(expr);

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
