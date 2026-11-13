"use client"

import { useRef, useSyncExternalStore, type MouseEvent } from "react"
import { translate, useT, type Translate } from "@/lib/i18n"

const emptySubscribe = () => () => {}

// Built in the browser from parts, so no served HTML or bundle carries the
// address whole for a scraper to find. The minifier folds constant joins, so
// the separator comes from a map it leaves alone. The server renders the link
// bare.
export const supportAddress = () => {
  const at = [63].map((code) => String.fromCharCode(code + 1)).join("")
  return ["support+globetrotter", "beansontoast.app"].join(at)
}

const mailUrl = (query = "") => ["mailto", supportAddress() + query].join(":")

// The note becomes a pre-filled message in the visitor's mail app, its subject
// in the visitor's language. Nothing is sent from the page.
export const composeSupportMail = (
  name: string,
  message: string,
  t: Translate = translate("en"),
) => {
  const from = name.trim()
  const text = message.trim()
  const subject = from
    ? t("support.subjectFrom", { name: from })
    : t("support.subject")
  const body = from ? `${text}\n\n${from}` : text
  return mailUrl(
    `?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
  )
}

// A modifier click means "do what links do", so it keeps the plain address.
const opensElsewhere = (event: MouseEvent) =>
  event.button !== 0 ||
  event.metaKey ||
  event.ctrlKey ||
  event.shiftKey ||
  event.altKey

const FIELD =
  "w-full rounded-[10px] border border-[var(--border)] bg-[var(--panel-2)] p-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"

export const SupportLink = () => {
  const t = useT()
  const address = useSyncExternalStore(
    emptySubscribe,
    supportAddress,
    () => null,
  )
  const dialog = useRef<HTMLDialogElement>(null)
  const form = useRef<HTMLFormElement>(null)

  const open = (event: MouseEvent<HTMLAnchorElement>) => {
    const element = dialog.current
    if (!element || typeof element.showModal !== "function") return
    if (opensElsewhere(event)) return
    event.preventDefault()
    element.returnValue = ""
    element.showModal()
  }

  const closed = () => {
    const element = dialog.current
    const fields = form.current
    if (!element || !fields || element.returnValue !== "send") return
    const data = new FormData(fields)
    window.location.href = composeSupportMail(
      String(data.get("name") ?? ""),
      String(data.get("message") ?? ""),
      t,
    )
    fields.reset()
  }

  return (
    <>
      <a
        href={address ? mailUrl() : undefined}
        onClick={open}
        className="cursor-pointer text-[var(--ink-dim)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
      >
        {t("support.link")}
      </a>
      <dialog
        ref={dialog}
        aria-labelledby="support-title"
        onClose={closed}
        // A click on the backdrop lands on the dialog itself; the card is the form.
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
        className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-[var(--border-strong)] bg-[var(--panel)] p-0 text-left text-[var(--ink)] shadow-2xl backdrop:bg-black/50 backdrop:backdrop-blur-sm"
      >
        <form ref={form} method="dialog" className="flex flex-col gap-4 p-6">
          <header>
            <p className="text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[var(--accent)]">
              ✦ Globetrotter
            </p>
            <h2
              id="support-title"
              className="font-display mt-1.5 text-2xl font-semibold"
            >
              {t("support.title")}
            </h2>
          </header>
          <p className="text-sm leading-relaxed text-[var(--ink-dim)]">
            {t("support.intro")}
          </p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">
              {t("support.name")}{" "}
              <span className="font-normal text-[var(--ink-faint)]">
                {t("support.optional")}
              </span>
            </span>
            <input
              name="name"
              autoComplete="name"
              maxLength={80}
              className={FIELD}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-medium">{t("support.message")}</span>
            <textarea
              name="message"
              rows={5}
              required
              maxLength={2000}
              className={`${FIELD} resize-y`}
            />
          </label>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="submit"
              value="cancel"
              formNoValidate
              className="rounded-[10px] border border-[var(--border)] px-3.5 py-2 text-sm font-medium text-[var(--ink-dim)] hover:border-[var(--accent)] hover:text-[var(--ink)]"
            >
              {t("support.cancel")}
            </button>
            <button
              type="submit"
              value="send"
              className="rounded-[10px] border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-2 text-sm font-semibold text-[var(--accent-ink)] hover:opacity-90"
            >
              {t("support.send")}
            </button>
          </div>
        </form>
      </dialog>
    </>
  )
}
