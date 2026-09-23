#!/usr/bin/env python3
"""Plain text for Atlassian Document Format, including a table inside a cell."""

from __future__ import annotations

import json
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
    print("adf nested tables ok")


if __name__ == "__main__":
    if "--check" in sys.argv:
        _check()
    else:
        print(adf_to_text(json.load(sys.stdin)))
