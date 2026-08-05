# Mercasto crawler and AI-referral policy

Reviewed: 2026-08-05  
Owner: Mercasto product, legal and engineering

## Objective

Mercasto wants public, approved pages to be discoverable and citable in search and AI answers while preventing private routes from being crawled and declining model-training collection where providers offer a separate search crawler.

## Production policy

| Agent or token | Decision | Reason |
|---|---|---|
| Googlebot | Allow public routes | Required for Google Search |
| Google-Extended | Allow public routes | It controls both Gemini model use and grounding; blocking it could reduce Gemini answer visibility |
| OAI-SearchBot | Allow public routes | Used for ChatGPT search discovery, snippets and citations |
| OAI-AdsBot | Allow public routes | Needed only when an OpenAI ad landing page is submitted; its content is not used for foundation-model training |
| GPTBot | Block all | OpenAI provides OAI-SearchBot separately, so training collection can be declined without blocking ChatGPT search |
| Claude-SearchBot | Allow public routes | Used to improve Claude search-result quality |
| Claude-User | Allow public routes | Supports user-directed retrieval in Claude |
| ClaudeBot | Block all | Anthropic provides separate search and user agents, so model-development crawling can be declined |
| PerplexityBot | Allow public routes | Used to surface and link sites in Perplexity search; documented as not used for foundation-model training |
| Other crawlers | Allow public routes | Existing default discovery policy remains, with private/system routes excluded |

## Private and non-indexable routes

Every allowed crawler group inherits explicit exclusions for API, administration, account, publishing, queue, webhook and KYC-storage paths. Authentication and authorization remain the security boundary; robots.txt is only crawl guidance.

Noindex pages must remain crawlable when a compatible crawler needs to read the noindex directive. Robots rules must not be used as a substitute for authentication, canonical tags, noindex, or deletion behavior.

## `llms.txt` decision

Mercasto does not publish `/llms.txt`.

The repository previously contained an unmaintained file with obsolete routes and unsupported claims. It is removed because:

- normal web discovery is controlled by robots.txt, indexability, canonicals, sitemaps, structured data and accessible content;
- current OpenAI, Anthropic, Google and Perplexity crawler guidance does not require a general-site `llms.txt` for search inclusion;
- provider documentation may use its own `llms.txt` as a documentation index, which does not establish a universal consumption contract for Mercasto;
- Mercasto now has canonical factual source pages that are safer to maintain and cite.

Reconsider only when a named target consumer documents support, ownership is assigned, and CI can prove the file stays synchronized with canonical sources.

## AI referral measurement

Campaign attribution normalizes identifiable sources into:

- `chatgpt`
- `perplexity`
- `claude`
- `gemini`
- `microsoft_copilot`

Events receive `attribution_medium=ai_referral`, `attribution_channel=ai_referral`, `attribution_ai_referral=true`, the normalized source, and only the referrer hostname. Full referring URLs and their query strings are not retained by this layer.

OpenAI documents `utm_source=chatgpt.com` on ChatGPT search referral URLs; the attribution layer normalizes that value to `chatgpt` even when no `utm_medium` is present.

## Official references reviewed

- Google common crawlers and Google-Extended: `https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers`
- OpenAI crawlers: `https://developers.openai.com/api/docs/bots`
- OpenAI publishers FAQ: `https://help.openai.com/en/articles/12627856-publishers-and-developers-faq`
- Anthropic crawler controls: `https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler`
- Perplexity crawler controls: `https://docs.perplexity.ai/docs/resources/perplexity-crawlers`

Review this policy whenever a provider changes agent names, merges search and training controls, or introduces a verifiable referral contract.
