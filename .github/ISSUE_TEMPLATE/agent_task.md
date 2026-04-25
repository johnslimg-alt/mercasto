---
name: Agent Task
description: Structured task for Mercasto AI agents
title: "[Agent Task]: "
labels: ["agents", "triage"]
body:
  - type: dropdown
    id: role
    attributes:
      label: Agent role
      options:
        - CEO Agent
        - HR Agent
        - Project Manager
        - Milestone Supervisor
        - Task Dispatcher
        - CTO Agent
        - CPO Agent
        - COO Agent
        - CMO Agent
        - CFO Agent
        - Legal/Risk Agent
        - DevOps Lead Agent
        - Security Lead Agent
        - QA Lead Agent
        - React Agent
        - Laravel Agent
        - PostgreSQL Agent
        - DBA Super Specialist
        - AI Agent
        - Designer
        - UI/UX Specialist
        - Design Reviewer
        - Marketer & SEO
        - Accountant
        - Economist
    validations:
      required: true
  - type: textarea
    id: objective
    attributes:
      label: Objective
      description: What exactly should the agent accomplish?
    validations:
      required: true
  - type: textarea
    id: context
    attributes:
      label: Context
      description: Product, technical, business, or security background.
    validations:
      required: true
  - type: textarea
    id: scope
    attributes:
      label: Scope and constraints
      description: Include forbidden actions, files/systems to inspect, and approval gates.
    validations:
      required: true
  - type: dropdown
    id: risk
    attributes:
      label: Risk level
      options:
        - Low: docs/copy/non-runtime
        - Medium: UI/backend behavior but no sensitive areas
        - High: auth/payments/uploads/database/infra/security
        - Critical: production/secrets/destructive operations
    validations:
      required: true
  - type: textarea
    id: critique
    attributes:
      label: Two-step critique requirement
      value: |
        Critique 1: risk and correctness
        - 

        Critique 2: alternatives and quality
        - 
    validations:
      required: true
  - type: textarea
    id: done
    attributes:
      label: Definition of done
      value: |
        - Output posted or PR opened
        - Risks documented
        - Smoke tests listed
        - Rollback notes included if relevant
        - Milestone Supervisor gate passed
    validations:
      required: true
---
