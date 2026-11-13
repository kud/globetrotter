"use client"

import { SupportLink } from "@/components/support-link"
import { useT } from "@/lib/i18n"

// Who makes this and where to get help, then the data credits: quiet, at the
// very end of the sidebar. A <div>, not a <p>, so the dialog can sit inside.
export const SiteFooter = () => {
  const t = useT()
  return (
    <footer className="flex flex-col gap-1 text-[0.7rem] leading-relaxed text-[var(--ink-faint)]">
      <div>
        <a
          href="https://beansontoast.app"
          className="text-[var(--ink-dim)] underline-offset-2 hover:text-[var(--accent)] hover:underline"
        >
          beansontoast.app
        </a>
        {" · "}
        <SupportLink />
      </div>
      <div>{t("footer.credits")}</div>
    </footer>
  )
}
