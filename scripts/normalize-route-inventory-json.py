#!/usr/bin/env python3
import json
import sys

FRAMEWORK_ENVIRONMENT_URIS = {'storage/{path}', 'up'}


def normalize_route(route):
    name = route.get('name')
    if isinstance(name, str) and name.startswith('generated::'):
        name = None
    return {
        'domain': route.get('domain'),
        'method': route.get('method'),
        'uri': route.get('uri'),
        'name': name,
        'action': route.get('action'),
        'middleware': route.get('middleware') or [],
    }


def sort_key(route):
    return (
        route['domain'] or '',
        route['uri'] or '',
        route['method'] or '',
        route['action'] or '',
        route['name'] or '',
        '\x1f'.join(route['middleware']),
    )


def main():
    routes = json.load(sys.stdin)
    normalized = [
        normalize_route(route)
        for route in routes
        if route.get('uri') not in FRAMEWORK_ENVIRONMENT_URIS
    ]
    normalized.sort(key=sort_key)
    sys.stdout.write('[\n')
    for index, route in enumerate(normalized):
        suffix = ',' if index < len(normalized) - 1 else ''
        encoded = json.dumps(route, ensure_ascii=False, separators=(',', ':'))
        sys.stdout.write(f'  {encoded}{suffix}\n')
    sys.stdout.write(']\n')


if __name__ == '__main__':
    main()
