#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export function pullRequestTriggerKinds(source) {
  const kinds = new Set();
  const scalar = source.match(/^on:\s*(pull_request(?:_target)?)\s*$/m);
  if (scalar) kinds.add(scalar[1]);

  const inline = source.match(/^on:\s*\[([^\]]*)\]\s*$/m);
  if (inline) {
    for (const kind of ['pull_request', 'pull_request_target']) {
      if (new RegExp(`\\b${kind}\\b`).test(inline[1])) kinds.add(kind);
    }
  }

  const lines = source.split(/\r?\n/);
  let inOn = false;
  for (const line of lines) {
    if (line === 'on:') {
      inOn = true;
      continue;
    }
    if (inOn && line !== '' && !line.startsWith(' ')) break;
    const match = inOn ? line.match(/^  (pull_request(?:_target)?):\s*$/) : null;
    if (match) kinds.add(match[1]);
  }

  return kinds;
}

export function hasPullRequestTrigger(source) {
  return pullRequestTriggerKinds(source).size > 0;
}

export function workflowJobs(source) {
  const lines = source.split(/\r?\n/);
  const jobs = [];
  let inJobs = false;
  let current = null;
  const flush = () => {
    if (current) jobs.push(current);
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === 'jobs:') {
      inJobs = true;
      continue;
    }
    if (!inJobs) continue;
    if (line !== '' && !line.startsWith(' ')) {
      flush();
      break;
    }

    const match = line.match(/^  ([A-Za-z0-9_-]+):\s*$/);
    if (match) {
      flush();
      current = { name: match[1], line: index + 1, lines: [line] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  flush();
  return jobs;
}

function jobUsesSelfHosted(job) {
  for (let index = 0; index < job.lines.length; index += 1) {
    const line = job.lines[index];
    if (!/^    runs-on:/.test(line)) continue;
    if (/self-hosted/.test(line)) return true;

    for (let next = index + 1; next < job.lines.length; next += 1) {
      if (/^    [A-Za-z0-9_-]+:/.test(job.lines[next])) break;
      if (/self-hosted/.test(job.lines[next])) return true;
    }
  }
  return false;
}

export function unsafeSelfHostedPullRequestJobs(source) {
  const triggers = pullRequestTriggerKinds(source);
  if (triggers.size === 0) return [];

  return workflowJobs(source).filter((job) => {
    if (!jobUsesSelfHosted(job)) return false;
    const block = job.lines.join('\n');

    // pull_request workflows are read from the PR merge ref. Even inline run
    // steps are therefore PR-controlled, so self-hosted jobs are forbidden.
    if (triggers.has('pull_request')) return true;

    // pull_request_target uses the trusted base workflow. A self-hosted job is
    // allowed only when it never checks out the PR or another repository ref.
    return triggers.has('pull_request_target')
      && /uses:\s*actions\/checkout@/.test(block);
  });
}

export function scanWorkflowFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  return unsafeSelfHostedPullRequestJobs(source).map((job) => ({
    file: path.relative(ROOT, filePath),
    job: job.name,
    line: job.line,
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const workflowDir = path.join(ROOT, '.github', 'workflows');
  const violations = fs.readdirSync(workflowDir)
    .filter((name) => /\.ya?ml$/.test(name))
    .flatMap((name) => scanWorkflowFile(path.join(workflowDir, name)));

  if (violations.length > 0) {
    for (const violation of violations) {
      console.error(`${violation.file}:${violation.line}: unsafe self-hosted pull-request job ${violation.job}`);
    }
    process.exit(1);
  }

  console.log('self-hosted pull-request safety gate OK');
}
