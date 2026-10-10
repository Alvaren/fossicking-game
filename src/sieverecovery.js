// Shared with the original claim's wet sieve. This is a game recovery model,
// not a measured yield: settling centres heavies; excessive jigging loses fines.
export function sieveRecovery(gem, nested, strat = 1, lost = 0) {
  if(gem.type==='agate')return .92;
  const settled=.3+.7*strat;
  let base=gem.ct<.15?(nested?.9:.6):(nested?.97:.88);
  if(gem.ct<.3)base*=Math.max(.25,1-lost*.35);
  return base*settled;
}
