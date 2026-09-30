// Reading IDs are server-generated UUIDs. Styling is stable across history and exports.
export function isGolden(id:string):boolean {
 const prefix=id.replaceAll('-','').slice(0,8);
 return /^[0-9a-f]{8}$/i.test(prefix)&&parseInt(prefix,16)%10===0;
}
