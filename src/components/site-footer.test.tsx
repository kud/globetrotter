import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import { LOCALES, translate } from "@/lib/i18n"
import { SiteFooter } from "./site-footer"
import { composeSupportMail, supportAddress } from "./support-link"

describe("site footer", () => {
  it("serves the support link with no address in it", () => {
    const html = renderToStaticMarkup(<SiteFooter />)
    expect(html).toContain("beansontoast.app")
    expect(html).toContain("Get support")
    expect(html).not.toContain("mailto")
    expect(html).not.toContain(String.fromCharCode(64))
  })

  it("builds the support address in the browser from its parts", () => {
    expect(supportAddress().split(String.fromCharCode(64))).toEqual([
      "support+globetrotter",
      "beansontoast.app",
    ])
  })

  it("hands the note to the mail app, signed when a name is given", () => {
    const url = new URL(composeSupportMail(" Sam ", " The globe froze. "))
    expect(url.protocol).toBe("mailto:")
    expect(url.searchParams.get("subject")).toBe(
      "Globetrotter support, from Sam",
    )
    expect(url.searchParams.get("body")).toBe("The globe froze.\n\nSam")
    expect(
      new URL(composeSupportMail("", "Hi")).searchParams.get("subject"),
    ).toBe("Globetrotter support")
  })

  it("writes the subject in the visitor's language", () => {
    const url = new URL(composeSupportMail("Sam", "Salut", translate("fr")))
    expect(url.searchParams.get("subject")).toBe(
      "Aide Globetrotter, de la part de Sam",
    )
  })

  it("resolves every support string in every locale", () => {
    const keys = [
      "footer.credits",
      "support.link",
      "support.title",
      "support.intro",
      "support.name",
      "support.optional",
      "support.message",
      "support.cancel",
      "support.send",
      "support.subject",
      "support.subjectFrom",
    ] as const
    for (const { id } of LOCALES) {
      const t = translate(id)
      for (const key of keys) expect(t(key)).not.toBe(key)
    }
  })

  it("serves the support dialog closed, with a labelled form", () => {
    const html = renderToStaticMarkup(<SiteFooter />)
    expect(html).toMatch(/<dialog[^>]*aria-labelledby="support-title"/)
    expect(html).not.toMatch(/<dialog[^>]* open/)
  })
})
