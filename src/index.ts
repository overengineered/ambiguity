export interface Maybe<T> {
  map: <R>(transform: (value: T) => R) => Maybe<R>;
  flatMap: <R>(transform: (value: T) => Maybe<R>) => Maybe<R>;
  use: (inspect: (value: T) => void) => Maybe<T>;
  useError: (inspect: (value: Reportable) => void) => Maybe<T>;
  recover: (transform: (value: Reportable) => Maybe<T>) => Maybe<T>;
  recoverAs: (result: Maybe<T>) => Maybe<T>;
  blend: (other: Maybe<T>, combine: (both: [T, T]) => T) => Maybe<T>;
  merge: <X>(value: X) => T | X;
  extract: () => T;
}

export interface Reportable extends Error {}

type ReportInfo = string | Error;

export class InvalidValue extends Error {}

export function takeValue<T>(value: T): Maybe<T> {
  const result: Maybe<T> = {
    map: (transform) => takeValue(transform(value)),
    flatMap: (transform) => transform(value),
    use: (inspect) => (inspect(value), result),
    useError: () => result,
    recover: () => result,
    recoverAs: () => result,
    blend: (other, combine) =>
      other.map((alt) => combine([value, alt])).recoverAs(result),
    merge: () => value,
    extract: () => value,
  };
  return result;
}

export function takeError<T = never>(info: ReportInfo): Maybe<T> {
  const reportable: Reportable =
    typeof info === `string` ? new InvalidValue(info) : info;
  const result: Maybe<T> = {
    map: () => result as never,
    flatMap: () => result as never,
    use: () => result,
    useError: (inspect) => (inspect(reportable), result),
    recover: (transform) => transform(reportable),
    recoverAs: (result) => result,
    blend: (other) => other,
    merge: (value) => value,
    extract: () => {
      throw reportable;
    },
  };
  return result;
}

export function takeNullable<T>(
  value: T | null | undefined,
  info?: ReportInfo
): Maybe<T> {
  return value == null
    ? takeError(info ?? `Should not be ${value}`)
    : takeValue<T>(value);
}

export function field<T, K extends keyof T>(
  key: K
): (value: T) => Maybe<Exclude<T[K], null | undefined>> {
  const path = String(key);
  return (obj: T) => {
    if (obj == null) {
      return takeError(`Cannot read "${path}" of ${obj}`);
    }
    const item = obj[key];
    if (item == null) {
      return takeError(`"${path}" is ${item} in ${typeof obj}`);
    } else {
      return takeValue(item as Exclude<T[K], null | undefined>);
    }
  };
}
