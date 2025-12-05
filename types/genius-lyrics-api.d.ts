declare module "genius-lyrics-api" {
  interface GetLyricsOptions {
    apiKey: string;
    title: string;
    artist: string;
    optimizeQuery?: boolean;
  }

  export function getLyrics(options: GetLyricsOptions): Promise<string>;
}
