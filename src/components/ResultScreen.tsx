import type { GameSnapshot } from "../game/types";
import { normalizeNickname, type RankingEntry } from "../storage/rankingStorage";
import { RankingBoard } from "./RankingBoard";

type Props = {
  snapshot: GameSnapshot;
  nickname: string;
  rankings: RankingEntry[];
  saved: boolean;
  canRestart: boolean;
  onNicknameChange: (nickname: string) => void;
  onSaveRanking: () => void;
  onRestart: () => void;
};

export function ResultScreen({
  snapshot,
  nickname,
  rankings,
  saved,
  canRestart,
  onNicknameChange,
  onSaveRanking,
  onRestart,
}: Props) {
  const canSave = normalizeNickname(nickname).length >= 3 && !saved;

  return (
    <div className="result-panel">
      <div className="result-heading">
        <span>{snapshot.title}</span>
        <h2>{snapshot.score.toLocaleString("ko-KR")}점</h2>
      </div>

      <div className="result-grid">
        <div>
          <span>되살린 꽃</span>
          <strong>{snapshot.caught}</strong>
        </div>
        <div>
          <span>최고 콤보</span>
          <strong>{snapshot.bestCombo}</strong>
        </div>
        <div>
          <span>쿨라워꽃</span>
          <strong>{snapshot.flowerCounts.coollower}</strong>
        </div>
        <div>
          <span>시든꽃</span>
          <strong>{snapshot.flowerCounts.wilted}</strong>
        </div>
      </div>

      <div className="ranking-form">
        <label>
          <span>랭킹 닉네임</span>
          <input
            value={nickname}
            maxLength={6}
            placeholder="3~6글자"
            onChange={(event) => onNicknameChange(normalizeNickname(event.target.value))}
          />
        </label>
        <button type="button" disabled={!canSave} onClick={onSaveRanking}>
          {saved ? "등록 완료" : "랭킹 등록"}
        </button>
      </div>

      <RankingBoard rankings={rankings} />

      <button type="button" className="secondary-button" disabled={!canRestart} onClick={onRestart}>
        {canRestart ? "다음 사람 시작" : "손 위치를 맞춰주세요"}
      </button>
    </div>
  );
}
