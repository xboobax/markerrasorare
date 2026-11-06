declare module '@neondatabase/serverless' {
  export function neon(url:string): { query(text:string,params:any[],opts?:any):Promise<any[]> };
}
