// Browser-evaluated geometry. Measure non-whitespace runs so CSS pre-wrap's
// invisible hanging line-end spaces are not mistaken for clipped glyphs.
export function measureTextOverflow(selector='[data-testid="app-shell"]'){
 const root=document.querySelector(selector),bad=[];
 if(!root)throw Error(`Missing text audit root: ${selector}`);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
 for(let node=walker.nextNode();node;node=walker.nextNode()){
  const el=node.parentElement;if(!el||el.closest('.atmosphere,[aria-hidden="true"]'))continue;
  const bounds=el.getBoundingClientRect(),style=getComputedStyle(el);
  if(!bounds.width||!bounds.height||style.visibility==='hidden')continue;
  const range=document.createRange();
  for(const word of node.textContent.matchAll(/\S+/g)){
   range.setStart(node,word.index);range.setEnd(node,word.index+word[0].length);
   for(const line of range.getClientRects())if(line.width&&(line.left<bounds.left-1||line.right>bounds.right+1))bad.push(`text outside ${el.tagName.toLowerCase()} bounds: "${word[0].slice(0,40)}" ${Math.round(line.left)}..${Math.round(line.right)} versus ${Math.round(bounds.left)}..${Math.round(bounds.right)}`);
  }
 }
 return bad;
}
