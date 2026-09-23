#!/usr/bin/env python3
"""Plain text for Atlassian Document Format, including nested tables and Confluence macros."""

from __future__ import annotations

import json
import re
import sys

MAX_DEPTH = 8


def adf_to_text(node) -> str:
    if not isinstance(node, dict):
        return ""
    return _blocks([node], 0).strip()


def _blocks(nodes, depth: int) -> str:
    parts = []
    for node in nodes or []:
        if not isinstance(node, dict):
            continue
        if depth > MAX_DEPTH:
            parts.append("[…]")
            continue
        kind = node.get("type")
        if kind == "table":
            parts.append(_table(node, depth))
        elif kind in {"extension", "inlineExtension", "bodiedExtension"}:
            parts.append(_macro(node, depth))
        elif kind in {"expand", "nestedExpand"}:
            parts.append(_expand(node, depth))
        elif kind in {"paragraph", "heading", "codeBlock", "blockquote"}:
            parts.append(_inline(node.get("content") or [], depth).strip())
        elif kind in {"bulletList", "orderedList"}:
            for index, item in enumerate(node.get("content") or [], 1):
                if not isinstance(item, dict):
                    continue
                body = _blocks(item.get("content") or [], depth + 1).strip()
                prefix = f"{index}. " if kind == "orderedList" else "- "
                parts.append(prefix + body.replace("\n", "\n  "))
        elif node.get("content"):
            parts.append(_blocks(node.get("content"), depth + 1).strip())
        elif kind == "text":
            parts.append(node.get("text") or "")
    return "\n".join(part for part in parts if part)


def _inline(nodes, depth: int) -> str:
    out = []
    for node in nodes or []:
        if not isinstance(node, dict):
            continue
        kind = node.get("type")
        if kind == "text":
            out.append(node.get("text") or "")
        elif kind == "hardBreak":
            out.append("\n")
        elif kind == "mention":
            out.append((node.get("attrs") or {}).get("text") or "")
        elif kind == "emoji":
            out.append((node.get("attrs") or {}).get("shortName") or "")
        elif kind in {"inlineCard", "blockCard"}:
            out.append(_card(node))
        elif kind in {"extension", "inlineExtension", "bodiedExtension"}:
            out.append(_macro(node, depth))
        elif kind == "table":
            out.append("\n" + _table(node, depth + 1))
        elif node.get("content"):
            out.append(_inline(node.get("content"), depth))
    return "".join(out)


def _table(table: dict, depth: int) -> str:
    occupied = set()
    origin = {}
    max_r = -1
    max_c = -1
    row_index = 0
    for row in table.get("content") or []:
        if not isinstance(row, dict) or row.get("type") != "tableRow":
            continue
        column = 0
        for cell in row.get("content") or []:
            if not isinstance(cell, dict) or cell.get("type") not in {"tableCell", "tableHeader"}:
                continue
            while (row_index, column) in occupied:
                column += 1
            text = _blocks(cell.get("content") or [], depth + 1).strip()
            attrs = cell.get("attrs") or {}
            span_c = _span(attrs.get("colspan"))
            span_r = _span(attrs.get("rowspan"))
            origin[(row_index, column)] = text
            for dr in range(span_r):
                for dc in range(span_c):
                    occupied.add((row_index + dr, column + dc))
                    max_r = max(max_r, row_index + dr)
                    max_c = max(max_c, column + dc)
            column += span_c
        row_index += 1
    if max_r < 0:
        return ""
    nested = any("\n" in origin.get((r, c), "") for r in range(max_r + 1) for c in range(max_c + 1))
    if not nested:
        lines = []
        for r in range(max_r + 1):
            values = [origin.get((r, c), "").replace("|", "/") for c in range(max_c + 1)]
            lines.append("| " + " | ".join(values) + " |")
        return "\n".join(lines)
    indent = "  " * depth
    inner = "  " * (depth + 1)
    lines = [f"{indent}[table]"]
    for r in range(max_r + 1):
        for c in range(max_c + 1):
            if (r, c) not in origin:
                continue
            text = origin[(r, c)].replace("\n", "\n" + inner)
            lines.append(inner + text)
    return "\n".join(lines)


def _macro(node: dict, depth: int) -> str:
    attrs = node.get("attrs") or {}
    key = attrs.get("extensionKey") or "macro"
    label = _macro_label(attrs)
    if node.get("type") != "bodiedExtension":
        return label
    body = _blocks(node.get("content") or [], depth + 1).strip()
    if not body:
        return label
    indented = "\n".join(f"  {line}" if line else "" for line in body.split("\n"))
    return f"{label}\n{indented}\n[/macro:{key}]"


def _expand(node: dict, depth: int) -> str:
    title = str((node.get("attrs") or {}).get("title") or "").replace("\n", " ").strip()[:120]
    label = f"[expand:{title}]" if title else "[expand]"
    body = _blocks(node.get("content") or [], depth + 1).strip()
    if not body:
        return label
    indented = "\n".join(f"  {line}" if line else "" for line in body.split("\n"))
    return f"{label}\n{indented}\n[/expand]"


def _macro_label(attrs: dict) -> str:
    key = attrs.get("extensionKey") or "macro"
    if key in {"jira", "jiraissue", "jiraissues"}:
        return _jira_label(attrs)
    params = (attrs.get("parameters") or {}).get("macroParams") or {}
    shown = []
    for name in ("title", "colour", "color", "key", "jqlQuery", "language"):
        value = _param_value(params.get(name))
        if value:
            shown.append(f"{name}={value}")
    return f"[macro:{key}]" if not shown else f"[macro:{key} {' '.join(shown)}]"


def _jira_label(attrs: dict) -> str:
    flat = _flat_params(attrs)
    keys = flat.get("key") or flat.get("issueKey") or flat.get("issues") or ""
    if not keys:
        text = str(attrs.get("text") or "").strip()
        if re.fullmatch(r"[A-Z][A-Z0-9]+-\d+(?:\s*,\s*[A-Z][A-Z0-9]+-\d+)*", text):
            keys = text
    jql = flat.get("jqlQuery") or flat.get("jql") or ""
    columns = flat.get("columns") or ""
    maximum = flat.get("maximumIssues") or flat.get("maxResults") or ""
    count = flat.get("count", "").lower() == "true"
    bits = ["[jira"]
    if keys:
        bits.append(re.sub(r"\s*,\s*", ", ", keys))
    if jql:
        bits.append(f'jql="{jql}"')
    if columns:
        bits.append(f"columns={columns}")
    if maximum:
        bits.append(f"max={maximum}")
    if count:
        bits.append("count")
    if len(bits) == 1:
        bits.append("issues")
    return " ".join(bits) + "]"


def _flat_params(attrs: dict) -> dict:
    parameters = attrs.get("parameters") or {}
    source = parameters.get("macroParams")
    if not isinstance(source, dict):
        source = {
            name: value
            for name, value in parameters.items()
            if name not in {"macroParams", "macroMetadata"}
        }
    flat = {}
    for name, value in source.items():
        if name in {"serverId", "macroId", "schemaVersion"}:
            continue
        limit = 180 if name in {"jqlQuery", "jql"} else 120
        text = _param_value(value, limit)
        if text:
            flat[name] = text
    return flat


def _card(node: dict) -> str:
    url = str((node.get("attrs") or {}).get("url") or "")
    match = re.search(r"/browse/([A-Z][A-Z0-9]+-\d+)", url)
    return f"[jira {match.group(1)}]" if match else url


def _param_value(value, limit: int = 120) -> str:
    if isinstance(value, dict):
        value = value.get("value")
    if isinstance(value, (str, int, float)):
        return str(value).replace("\n", " ").strip()[:limit]
    return ""


def _span(value) -> int:
    try:
        return max(1, int(value or 1))
    except (TypeError, ValueError):
        return 1


def _check() -> None:
    inner = {
        "type": "table",
        "content": [{
            "type": "tableRow",
            "content": [
                {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Дата"}]}]},
                {"type": "tableCell", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "12 сен"}]}]},
            ],
        }],
    }
    doc = {
        "type": "doc",
        "version": 1,
        "content": [{
            "type": "table",
            "content": [{
                "type": "tableRow",
                "content": [
                    {"type": "tableHeader", "content": [{"type": "paragraph", "content": [{"type": "text", "text": "Задача"}]}]},
                    {"type": "tableCell", "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "MER-42"}]},
                        inner,
                    ]},
                ],
            }],
        }],
    }
    text = adf_to_text(doc)
    assert "[table]" in text, text
    assert "Задача" in text and "MER-42" in text, text
    assert "| Дата | 12 сен |" in text, text
    assert "MER-42 | Дата" not in text, text

    deep = {"type": "paragraph", "content": [{"type": "text", "text": "конец"}]}
    node = deep
    for _ in range(MAX_DEPTH + 3):
        node = {"type": "table", "content": [{"type": "tableRow", "content": [{"type": "tableCell", "content": [node]}]}]}
    limited = adf_to_text(node)
    assert "[…]" in limited, limited
    assert limited.count("[table]") <= MAX_DEPTH + 1

    macro = {
        "type": "bodiedExtension",
        "attrs": {
            "extensionType": "com.atlassian.confluence.macro.core",
            "extensionKey": "info",
            "parameters": {
                "macroParams": {"title": {"value": "Релиз"}},
                "macroMetadata": {"macroId": {"value": "uuid-should-not-appear"}},
            },
        },
        "content": [
            {"type": "paragraph", "content": [
                {"type": "text", "text": "Статус "},
                {"type": "inlineExtension", "attrs": {
                    "extensionKey": "status",
                    "parameters": {"macroParams": {"title": {"value": "Done"}, "colour": {"value": "Green"}}},
                }},
            ]},
            {"type": "bodiedExtension", "attrs": {
                "extensionKey": "expand",
                "parameters": {"macroParams": {"title": {"value": "Детали"}}},
            }, "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "внутри"}]},
                inner,
            ]},
            {"type": "extension", "attrs": {
                "extensionKey": "jira",
                "parameters": {"macroParams": {"key": {"value": "MER-42"}}},
            }},
        ],
    }
    rendered = adf_to_text(macro)
    assert "[macro:info title=Релиз]" in rendered, rendered
    assert "[macro:status title=Done colour=Green]" in rendered, rendered
    assert "[macro:expand title=Детали]" in rendered and "внутри" in rendered, rendered
    assert "| Дата | 12 сен |" in rendered, rendered
    assert "[macro:jira key=MER-42]" not in rendered
    assert "[jira MER-42]" in rendered, rendered
    assert "uuid-should-not-appear" not in rendered, rendered
    assert rendered.index("[/macro:expand]") < rendered.index("[jira MER-42]"), rendered

    jql_macro = {
        "type": "extension",
        "attrs": {
            "extensionKey": "jiraissues",
            "parameters": {
                "jqlQuery": "project = MER AND status = Done",
                "columns": "key,summary,status",
                "maximumIssues": 20,
                "count": "true",
                "serverId": "d4e5-hidden",
            },
        },
    }
    jql_text = adf_to_text(jql_macro)
    assert '[jira jql="project = MER AND status = Done"' in jql_text, jql_text
    assert "columns=key,summary,status" in jql_text and "max=20" in jql_text and "count" in jql_text, jql_text
    assert "d4e5-hidden" not in jql_text, jql_text
    card = adf_to_text({"type": "inlineCard", "attrs": {"url": "https://mercasto.atlassian.net/browse/MER-7"}})
    assert card == "[jira MER-7]", card
    print("adf nested tables ok")


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check()
    else:
        print(adf_to_text(json.load(sys.stdin)))
