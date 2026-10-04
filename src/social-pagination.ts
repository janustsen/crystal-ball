export async function allRows<T>(page:(from:number,to:number)=>PromiseLike<{data:T[]|null;error:unknown}>):Promise<{data:T[]|null;error:unknown}>{
 const rows:T[]=[];
 for(let from=0;;from+=500){
  const result=await page(from,from+499);
  if(result.error)return {data:null,error:result.error};
  rows.push(...(result.data??[]));
  if((result.data?.length??0)<500)return {data:rows,error:null};
 }
}
