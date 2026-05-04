import type { RankingEntry } from "../storage/rankingStorage";

type Props = {
  rankings: RankingEntry[];
};

export function RankingBoard({ rankings }: Props) {
  if (rankings.length === 0) {
    return <p className="ranking-empty">아직 등록된 랭킹이 없습니다.</p>;
  }

  return (
    <ol className="ranking-list" aria-label="쿨라워 랭킹">
      {rankings.slice(0, 5).map((entry, index) => (
        <li key={entry.id}>
          <span>{index + 1}</span>
          <strong>{entry.nickname}</strong>
          <em>{entry.score.toLocaleString("ko-KR")}</em>
        </li>
      ))}
    </ol>
  );
}
