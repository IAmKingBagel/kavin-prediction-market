/** Stable pseudonym from player UUID, e.g. "Player #472" */
export function playerPseudonym(playerId: string): string {
  let hash = 0;
  for (let i = 0; i < playerId.length; i++) {
    hash = (hash * 31 + playerId.charCodeAt(i)) >>> 0;
  }
  const num = (hash % 900) + 100; // 100–999
  return `Player #${num}`;
}

export function displayName(
  playerId: string,
  realName: string,
  currentPlayerId: string | null,
  adminMode: boolean
): string {
  if (adminMode) return realName;
  if (currentPlayerId && playerId === currentPlayerId) return "You";
  return playerPseudonym(playerId);
}
