// pdf-parse-fork ships no types of its own; its API matches pdf-parse (the
// @types/pdf-parse package is installed but keyed to the original module name).
declare module 'pdf-parse-fork' {
  interface PdfParseResult {
    numpages: number;
    numrender: number;
    info: unknown;
    metadata: unknown;
    version: string;
    text: string;
  }

  interface PdfParseOptions {
    pagerender?: (pageData: unknown) => string | Promise<string>;
    max?: number;
    version?: string;
  }

  function pdfParse(dataBuffer: Buffer, options?: PdfParseOptions): Promise<PdfParseResult>;

  export = pdfParse;
}
