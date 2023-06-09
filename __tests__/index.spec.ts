import { Maybe, field, takeError, takeNullable, takeValue } from "../src";

function divide100(
  divisor: number
): Maybe<{ quotient: number; remainder: number }> {
  return divisor === 0
    ? takeError("Cannot divide by 0")
    : takeValue(Math.floor(100 / divisor)).map((quotient) => ({
        quotient,
        remainder: 100 - quotient * divisor,
      }));
}

describe("ambiguity", () => {
  it("should apply transformation to value", () => {
    const result: string = takeValue(1).map(String).merge("fallback");
    expect(result).toBe("1");
  });

  it("should apply flat transformation to value", () => {
    const result = takeValue(10).flatMap(divide100).merge(Infinity);
    expect(result).toEqual({ quotient: 10, remainder: 0 });
  });

  it("should apply flat transformation to error", () => {
    const errorInfo = jest.fn();
    takeValue(0).flatMap(divide100).useError(errorInfo);
    expect(errorInfo).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should not apply transformation to error and recover to fallback", () => {
    const result: string | number = takeError("Fail!")
      .map(String)
      .merge(0xc0ffee);
    expect(result).toBe(0xc0ffee);
  });

  it("should not apply transformation to null and recover to fallback", () => {
    const result: string | number = takeNullable(null)
      .map(String)
      .merge(0xc0ffee);
    expect(result).toBe(0xc0ffee);
  });

  it("should ignore useError for value", () => {
    const errorInfo = jest.fn();
    const result = takeValue(1).useError(errorInfo).merge(2);
    expect(errorInfo).toHaveBeenCalledTimes(0);
    expect(result).toBe(1);
  });

  it("should invoke useError for error", () => {
    const errorInfo = jest.fn();
    takeError(new Error("Sample")).useError(errorInfo);
    expect(errorInfo).toHaveBeenCalledTimes(1);
    expect(errorInfo).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should provide error info on null", () => {
    const errorInfo = jest.fn();
    takeNullable(undefined).useError(errorInfo);
    expect(errorInfo).toHaveBeenCalledWith(expect.any(Error));
  });

  it("should provide path info when accessing null field", () => {
    expect(() =>
      takeValue({ mypath: null as 1 | null })
        .flatMap(field("mypath"))
        .extract()
    ).toThrow("mypath");
  });

  it("should provide path info when accessing field on null", () => {
    const wronglyTyped = undefined as unknown as { value: number };
    expect(() =>
      takeValue(wronglyTyped).flatMap(field("value")).extract()
    ).toThrow("value");
  });
});
