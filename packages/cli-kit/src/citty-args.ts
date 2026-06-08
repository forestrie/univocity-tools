/** Practical citty args shape for parse* functions (avoids strict ParsedArgs generics). */
export type LooseParsedArgs = {
  _?: string[];
  [key: string]: string | number | boolean | string[] | undefined;
};
