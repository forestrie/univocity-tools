export type OptionSourceContext = {
  env?: NodeJS.ProcessEnv;
};

const ENV_NAMED_PATTERN = /^\$\{env:([A-Za-z_][A-Za-z0-9_]*)\}$/;
const ENV_IMPLICIT_PATTERN = /^\$\{env\}$/;
const ESCAPED_ENV_TEMPLATE_PATTERN =
  /^\\\$\{env(?::[A-Za-z_][A-Za-z0-9_]*)?\}$/;

/** Map a kebab-case option name to an environment variable name. */
export function optionNameToEnvVar(optionName: string): string {
  return optionName
    .split("-")
    .map((segment) => segment.toUpperCase())
    .join("_");
}

function kebabToCamel(optionName: string): string {
  const segments = optionName.split("-");
  const [first, ...rest] = segments;
  if (first === undefined) {
    return optionName;
  }
  return (
    first +
    rest.map((segment) => segment[0]!.toUpperCase() + segment.slice(1)).join("")
  );
}

/** Remove backslash escapes before `${` so `\${env}` becomes a literal template. */
function unescapeOptionValue(raw: string): string {
  return raw.replace(/\\\$\{/g, "${");
}

function readEnvValue(
  env: NodeJS.ProcessEnv,
  varName: string,
): string | undefined {
  const value = env[varName];
  if (value === undefined || value.length === 0) {
    return undefined;
  }
  return value;
}

function resolveEnvSource(
  varName: string | undefined,
  optionName: string,
  env: NodeJS.ProcessEnv,
): string | undefined {
  const resolvedName = varName ?? optionNameToEnvVar(optionName);
  return readEnvValue(env, resolvedName);
}

/**
 * Evaluate named option value sources before any other parse processing.
 *
 * Whole-value templates only: `${env:VAR}` or `${env}` (implicit VAR from
 * option name). Backslash escapes produce literal `${…}` strings.
 */
export function evaluateOptionValue(
  optionName: string,
  raw: string | undefined,
  context?: OptionSourceContext,
): string | undefined {
  if (raw === undefined) {
    return undefined;
  }

  if (ESCAPED_ENV_TEMPLATE_PATTERN.test(raw)) {
    return unescapeOptionValue(raw);
  }

  const env = context?.env ?? process.env;

  const namedMatch = raw.match(ENV_NAMED_PATTERN);
  if (namedMatch) {
    return resolveEnvSource(namedMatch[1], optionName, env);
  }

  if (ENV_IMPLICIT_PATTERN.test(raw)) {
    return resolveEnvSource(undefined, optionName, env);
  }

  return raw;
}

/** Read a string option from citty args (kebab or camelCase) and evaluate sources. */
export function readEvaluatedStringOption(
  args: Record<string, unknown>,
  optionName: string,
  context?: OptionSourceContext,
): string | undefined {
  const camel = kebabToCamel(optionName);
  const raw = args[camel] ?? args[optionName];
  if (typeof raw !== "string") {
    return undefined;
  }
  return evaluateOptionValue(optionName, raw, context);
}
