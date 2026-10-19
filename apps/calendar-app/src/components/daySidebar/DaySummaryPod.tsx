import React, { useState } from 'react';
import { Sparkles, Headphones, Play, Pause } from 'lucide-react';

interface DaySummaryPodProps {
  summaryData: any;
}

export const DaySummaryPod: React.FC<DaySummaryPodProps> = ({ summaryData }) => {
  const [isPlayingPodcast, setIsPlayingPodcast] = useState(false);
  const [activeTurnIdx, setActiveTurnIdx] = useState(-1);

  if (!summaryData) return null;

  const stopPodcastAudio = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingPodcast(false);
    setActiveTurnIdx(-1);
  };

  const playTurn = (turns: any[], idx: number) => {
    if (idx >= turns.length) {
      setIsPlayingPodcast(false);
      setActiveTurnIdx(-1);
      return;
    }
    setActiveTurnIdx(idx);
    const turn = turns[idx];
    const utterance = new SpeechSynthesisUtterance(turn.text);
    utterance.lang = 'ru-RU';
    utterance.pitch = turn.role === 'host1' ? 0.9 : 1.25;

    const voices = window.speechSynthesis.getVoices();
    const ruVoices = voices.filter((v) => v.lang.startsWith('ru'));
    if (ruVoices.length > 1) {
      utterance.voice = turn.role === 'host1' ? ruVoices[0] : ruVoices[1];
    } else if (ruVoices.length === 1) {
      utterance.voice = ruVoices[0];
    }

    utterance.onend = () => playTurn(turns, idx + 1);
    utterance.onerror = () => {
      setIsPlayingPodcast(false);
      setActiveTurnIdx(-1);
    };
    window.speechSynthesis.speak(utterance);
  };

  const handleTogglePodcast = () => {
    if (!summaryData?.podcast?.turns || summaryData.podcast.turns.length === 0) return;
    if (isPlayingPodcast) {
      stopPodcastAudio();
    } else {
      setIsPlayingPodcast(true);
      playTurn(summaryData.podcast.turns, 0);
    }
  };

  return (
    <div className="px-4 sm:px-5 py-3 bg-[#181a1a] border-b border-[#242828] space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono font-semibold text-[#c9cd58] flex items-center gap-1.5 uppercase tracking-wider">
          <Sparkles className="w-3 h-3 text-[#c9cd58]" />
          Резюме дня (Clean Data)
        </span>
      </div>

      {summaryData.headlineSynthesis && (
        <p className="text-xs text-[#c9c7b2] leading-relaxed">
          {summaryData.headlineSynthesis}
        </p>
      )}

      {summaryData.topThemes && summaryData.topThemes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {summaryData.topThemes.map((theme: string) => (
            <span
              key={theme}
              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#242828] text-[#93927e]"
            >
              #{theme}
            </span>
          ))}
        </div>
      )}

      {/* Daily Podcast Audio Overview */}
      {summaryData.podcast && (
        <div className="mt-2 p-3 rounded-lg bg-[#1f2323] border border-[#c9cd58]/30 flex flex-col gap-2 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-full bg-[#c9cd58]/20 text-[#c9cd58]">
                <Headphones className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-semibold text-white">
                  {summaryData.podcast.title}
                </div>
                <div className="text-[10px] text-[#93927e]">
                  NotebookLM Audio Overview • {summaryData.podcast.host1Name} & {summaryData.podcast.host2Name}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTogglePodcast}
              className={`p-2 rounded-full transition-all duration-200 shadow-md ${
                isPlayingPodcast
                  ? 'bg-amber-400 text-black hover:bg-amber-300'
                  : 'bg-[#c9cd58] text-[#121414] hover:bg-[#e5e971]'
              }`}
              title={isPlayingPodcast ? 'Пауза' : 'Слушать подкаст'}
            >
              {isPlayingPodcast ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5 translate-x-0.5" />
              )}
            </button>
          </div>

          {isPlayingPodcast && activeTurnIdx >= 0 && summaryData.podcast.turns[activeTurnIdx] && (
            <div className="mt-1 p-2 rounded bg-[#121414] border border-white/5 text-[11px] text-[#c9c7b2]">
              <span className="font-bold text-[#c9cd58] mr-1.5">
                {summaryData.podcast.turns[activeTurnIdx].speaker}:
              </span>
              <span>{summaryData.podcast.turns[activeTurnIdx].text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
