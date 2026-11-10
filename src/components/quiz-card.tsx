"use client"

import { useTravelStore } from "@/lib/store"
import { useT } from "@/lib/i18n"
import { getCountryInfo } from "@/lib/country-info"

const QuizCard = () => {
  const t = useT()
  const locale = useTravelStore((s) => s.locale)
  const quiz = useTravelStore((s) => s.quiz)
  const targetId = useTravelStore((s) => s.quizTargetId)
  const options = useTravelStore((s) => s.quizOptions)
  const chosen = useTravelStore((s) => s.quizChosen)
  const score = useTravelStore((s) => s.quizScore)
  const streak = useTravelStore((s) => s.quizStreak)
  const answerQuiz = useTravelStore((s) => s.answerQuiz)
  const nextQuiz = useTravelStore((s) => s.nextQuiz)

  if (!quiz || !targetId) return null

  const answered = chosen !== null
  const correct = chosen === targetId

  const nameOf = (id: string) => {
    const info = getCountryInfo(id)
    return locale === "fr" ? (info?.nameFr ?? info?.name) : info?.name
  }

  const optionStyle = (id: string) => {
    if (!answered)
      return "border-[var(--border)] text-[var(--ink)] hover:border-[var(--accent)] hover:bg-[var(--panel-hover)]"
    if (id === targetId)
      return "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-ink)] font-semibold"
    if (id === chosen) return "border-[var(--danger)] text-[var(--danger)]"
    return "border-[var(--border)] text-[var(--ink-dim)] opacity-60"
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-20 w-[min(26rem,92vw)] -translate-x-1/2 rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-4 shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--ink)]">
          {t("quiz.prompt")}
        </p>
        <p className="shrink-0 text-xs text-[var(--ink-dim)]">
          {t("quiz.score", { score: `${score.correct}/${score.answered}` })} ·{" "}
          {t("quiz.streak", { n: streak })}
        </p>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-1.5">
        {options.map((id) => (
          <button
            key={id}
            disabled={answered}
            onClick={() => answerQuiz(id)}
            className={`rounded-lg border px-2 py-2 text-sm font-medium transition-colors disabled:cursor-default ${optionStyle(id)}`}
          >
            {nameOf(id)}
          </button>
        ))}
      </div>
      {answered && (
        <>
          <p
            className={`mt-2 text-sm ${
              correct
                ? "font-semibold text-[var(--accent)]"
                : "text-[var(--ink)]"
            }`}
          >
            {correct
              ? t("quiz.correct")
              : t("quiz.wrong", { name: nameOf(targetId) ?? "" })}{" "}
            {getCountryInfo(targetId)?.flag ?? ""}
          </p>
          <button
            onClick={nextQuiz}
            className="mt-2 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-[var(--accent-ink)] transition-opacity hover:opacity-90"
          >
            {t("quiz.next")}
          </button>
        </>
      )}
    </div>
  )
}

export default QuizCard
