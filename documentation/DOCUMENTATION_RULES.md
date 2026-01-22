# Documentation Rules

## Core Principles

### 1. Append-Only Policy
- **NEVER** modify existing documentation files
- **NEVER** overwrite historical reports
- **NEVER** delete archived documentation
- Create new files for new work instead of editing old ones

### 2. Immediate Preservation
- Save documentation immediately after work completion
- Don't wait for "polishing" before archiving
- Raw reports are more valuable than delayed perfect ones

### 3. One Report, One File
- Each distinct report gets its own `.md` file
- No merging of multiple reports into single documents
- Keep file sizes manageable (split large reports into logical sections)

### 4. Descriptive Naming
- Use kebab-case: `feature-name-report-type.md`
- Include report type: `-diagnostic`, `-implementation`, `-walkthrough`
- Add dates when relevant: `-jan2026` or `-2026-01-20`
- Examples:
  - `frontend-render-diagnostic-jan2026.md`
  - `multi-llm-implementation-complete.md`
  - `conditional-prompting-strategy.md`

### 5. Required Metadata
Each report should include (at minimum):
```markdown
# [Report Title]
**Date**: YYYY-MM-DD
**Author/Source**: [Team member or system]
**Type**: [Diagnostic | Implementation | Architecture | Decision]
```

### 6. Placement Guidelines

**Architecture** → Design decisions, system structure, technical research  
**Diagnostics** → Problem investigations, root cause analyses  
**Implementation** → Build plans, completion walkthroughs, how-it-was-done  
**Decisions** → Why we chose X over Y, trade-off analyses  
**Prompts** → LLM interaction patterns, prompt engineering  
**Releases** → Stakeholder summaries, version rollouts  

When uncertain, choose based on primary purpose.

### 7. Linking Strategy
- Use relative paths: `../architecture/system-design.md`
- Link to related documentation within reports
- Maintain a "See Also" section for related reports

### 8. Update Frequency
- Save reports within 24 hours of work completion
- Don't batch multiple weeks of documentation
- Fresh memory produces better reports

### 9. Format Requirements
- Use Markdown (`.md`) exclusively
- Include code blocks with language tags
- Add diagrams using Mermaid when applicable
- Keep line length reasonable for diff-ability

### 10. Prohibited Actions
- ❌ Editing reports after initial save
- ❌ Creating "documentation backlog"
- ❌ Storing binaries in this directory (link to artifacts instead)
- ❌ Using this for TODO lists (use project tracking instead)

---

**Rationale**: This is institutional memory, not a wiki. Immutability ensures trust.

Last Updated: January 21, 2026
