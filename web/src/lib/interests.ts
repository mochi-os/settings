// Copyright © 2026 Mochisoft OÜ
// SPDX-License-Identifier: AGPL-3.0-only
// This file is part of Mochi, licensed under the GNU AGPL v3 with the
// Mochi Application Interface Exception - see license.txt and license-exception.md.
// The Wikipedia a language's articles live on, as Wikidata names the site.
// Most are the language's primary subtag; these few are not.
const wikis: Record<string, string> = { nb: 'no', bho: 'bh', yue: 'zh_yue' }

// A link to the interest's article in the language its label was resolved in,
// falling back to English where that Wikipedia has none: Wikidata's
// GoToLinkedPage takes a list of sites and follows the first with an article.
export function interestLink(qid: string, language: string | undefined) {
  const primary = (language || 'en').toLowerCase().split('-')[0]
  const site = (wikis[primary] ?? primary) + 'wiki'
  const sites = site === 'enwiki' ? site : `${site},enwiki`
  return `https://www.wikidata.org/wiki/Special:GoToLinkedPage/${sites}/${qid}`
}
