declare module 'mammoth' {
    export interface MammothOptions {
        arrayBuffer: ArrayBuffer;
    }

    export interface MammothResult {
        value: string;
        messages: any[];
    }

    export function extractRawText(options: MammothOptions): Promise<MammothResult>;
}
