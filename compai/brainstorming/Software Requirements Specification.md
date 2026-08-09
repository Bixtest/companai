# Software Requirements Specification
# AI Company Operating Platform

**Document type:** Functional Product SRS  
**Status:** Product baseline  
**Purpose:** Define the complete target product before deciding what to build, reuse, adapt, or integrate.

---

# 1. Purpose

The platform is an operating environment for companies where human employees and AI employees can work together as part of the same organization.

A company should be able to describe what it does, what it wants to achieve, and how it currently operates. The platform's AI should then help build and continuously improve the company's digital operating structure.

The platform should be capable of creating and managing:

- Company structure.
- Departments.
- Teams.
- Human roles.
- AI roles.
- AI employees.
- Background agents.
- Goals.
- Projects.
- Tasks.
- Processes.
- Knowledge bases.
- Skills.
- Procedures.
- Tools.
- Internal applications.
- Dashboards.
- Reports.
- Approval rules.
- Work policies.
- Performance measurements.
- Automation.
- Company memory.

Humans and AI should not be treated as two separate worlds.

They should participate in the same work system while having different capabilities, permissions, responsibilities, limits, and supervision requirements.

---

# 2. Product Vision

The platform should allow a company to move from:

> "This is our company, this is what we do, and this is what we want."

to:

> "Here is your proposed organization, knowledge structure, workforce, workflows, AI employees, internal tools, procedures, dashboards, and operating environment."

The platform should then help the company operate that environment every day.

The system is therefore not only a project-management tool, an agent platform, a knowledge base, or an application builder.

It combines these ideas into a single **AI-native company operating system**.

---

# 3. Scope of This SRS

This SRS describes the unique capabilities required for this product.

It intentionally does **not** specify normal software features such as:

- Login.
- Password reset.
- General account management.
- Language settings.
- Theme settings.
- Basic notification preferences.
- Billing.
- Subscription management.
- Generic portal administration.
- Standard backup settings.
- Standard user-profile fields.

These are assumed to exist but are outside this document.

This SRS also does not assume that CRM, ERP, office applications, communication systems, or other external products will be integrated.

Instead, it describes the functionality the final platform should provide from the user's point of view.

Later, each requirement can be classified as:

- Build natively.
- Reuse open-source code.
- Adapt open-source logic into our code.
- Use an internal subsystem.
- Use a separate integrated application.

---

# 4. Core Product Principles

## 4.1 One company, one operating model

The platform must represent the company as one connected organization.

Departments, teams, people, AI employees, knowledge, applications, processes, goals, tasks, and data must be able to relate to each other.

---

## 4.2 Humans and AI are both workers

A role may be occupied by:

- A human.
- An AI employee.
- Several humans.
- Several AI employees.
- A mixed human/AI team.

The work system should not require separate task models for humans and AI.

---

## 4.3 AI must work under authority

Every AI employee must have defined:

- Responsibilities.
- Permissions.
- Knowledge access.
- Skills.
- Tools.
- Limits.
- Budget.
- Manager.
- Escalation rules.
- Approval requirements.

No AI worker should operate as an invisible unlimited administrator.

---

## 4.4 Important actions must remain attributable

The platform must always know who caused an action.

The actor may be:

- A human.
- An AI employee.
- A background agent.
- A system process.
- Another authorized service.

An AI employee acting on behalf of a human must remain identifiable as the actual executor.

---

## 4.5 AI should create structure, not only answer questions

The platform AI should be able to create and maintain useful company assets such as:

- Departments.
- Roles.
- Job descriptions.
- Workflows.
- Knowledge structures.
- Skills.
- Procedures.
- Task templates.
- Dashboards.
- Internal applications.
- Reports.

---

## 4.6 The company owns its operating knowledge

Company knowledge must not exist only inside conversations with AI.

Important knowledge discovered or created by AI must be capable of becoming an approved company asset.

---

## 4.7 AI changes must be governed

An AI employee may discover a better procedure or skill.

It should be able to propose that improvement.

It should not silently change an important company-wide procedure without the required authority.

---

# 5. Core Product Objects

The system should support the following major objects.

### Organization objects

- Company Blueprint.
- Department.
- Team.
- Role.
- Position.
- Human Employee.
- AI Employee.
- Background Agent.
- Reporting Relationship.
- Responsibility.
- Capability.
- Permission.
- Delegation.

### Work objects

- Goal.
- Objective.
- Project.
- Initiative.
- Task.
- Subtask.
- Assignment.
- Deliverable.
- Milestone.
- Decision.
- Approval.
- Blocker.
- Escalation.

### Knowledge objects

- Knowledge Domain.
- Knowledge Base.
- Source.
- Fact.
- Procedure.
- Policy.
- Guide.
- Template.
- Research Report.
- Decision Record.
- Lesson Learned.
- Skill.
- Skill Version.

### Automation objects

- Trigger.
- Condition.
- Action.
- Workflow.
- Workflow Run.
- Schedule.
- Event.
- Automation Rule.

### Application objects

- Data Object.
- Field.
- Form.
- View.
- Table.
- Board.
- Dashboard.
- Chart.
- Report.
- Internal App.
- Micro-App.
- App Action.

### AI governance objects

- Agent Profile.
- Model Policy.
- Tool Permission.
- Knowledge Scope.
- Runtime Limit.
- Budget.
- Evaluation.
- Performance Record.
- Approval Requirement.
- AI Incident.

---

# 6. Company Discovery

## FR-001 — Company Interview

The platform must be able to interview company founders, managers, or authorized employees.

The interview should discover information such as:

- What the company does.
- Products and services.
- Customers.
- Markets.
- Business model.
- Internal operations.
- Existing team.
- Important processes.
- Current problems.
- Growth goals.
- Regulations.
- Competitors.
- Tools currently used.
- Important company knowledge.
- Work that can potentially be handled by AI.

The interview should be conversational rather than requiring one large form.

---

## FR-002 — Progressive Discovery

The system must not require all information at once.

It should:

1. Start with basic information.
2. Build an initial understanding.
3. Detect missing information.
4. Ask additional questions.
5. Research when appropriate.
6. Update its understanding.

---

## FR-003 — Discovery Gap Detection

The AI must identify areas where it does not have enough information.

Examples:

- Unknown approval process.
- Missing pricing model.
- Unclear reporting structure.
- Unknown legal jurisdiction.
- Unknown customer onboarding process.

The system should distinguish between:

- Confirmed information.
- Assumed information.
- AI inference.
- Unknown information.

---

# 7. Company Research Engine

## FR-010 — Automatic Company Research

The platform should be able to research the company and its environment.

Research may include:

- Industry.
- Market.
- Competitors.
- Regulations.
- Customer expectations.
- Common business processes.
- Industry terminology.
- Standard job functions.
- Common risks.
- Common metrics.
- Common software requirements.

---

## FR-011 — Research Plans

The AI should create a research plan before large research activities.

Example:

1. Understand the company's services.
2. Research the industry.
3. Identify competitors.
4. Identify regulatory requirements.
5. Identify common operational processes.
6. Identify common company roles.
7. Identify useful automation opportunities.

---

## FR-012 — Research Sources

Research findings should retain information about where they came from.

The system should store:

- Source.
- Date.
- Subject.
- Extracted information.
- Confidence.
- Verification status.

---

## FR-013 — Research-to-Knowledge Promotion

Research findings should not automatically become official company knowledge.

The platform must allow findings to move through states such as:

- Discovered.
- Draft.
- Reviewed.
- Approved.
- Official.
- Superseded.
- Rejected.

---

# 8. Company Blueprint

## FR-020 — Company Blueprint

The platform must maintain a structured description of how the company operates.

The Company Blueprint should contain or reference:

- Purpose.
- Business model.
- Products.
- Services.
- Markets.
- Departments.
- Teams.
- Roles.
- Employees.
- AI employees.
- Processes.
- Knowledge areas.
- Applications.
- Data objects.
- Policies.
- Approval rules.
- Goals.
- Performance indicators.

---

## FR-021 — AI Blueprint Generation

The AI should be able to generate a proposed Company Blueprint based on discovery and research.

It may propose:

- Departments.
- Roles.
- AI roles.
- Processes.
- Knowledge bases.
- Internal applications.
- Reports.
- Dashboards.
- Automation.
- Skills.

---

## FR-022 — Blueprint Review

The generated blueprint must be reviewable.

Users should be able to:

- Accept items.
- Reject items.
- Edit items.
- Ask AI why something was suggested.
- Request alternatives.
- Delay an item.
- Mark an item as unnecessary.

---

## FR-023 — Blueprint Versioning

Every important change to the Company Blueprint must create a version or revision record.

The company must be able to see:

- What changed.
- Who changed it.
- Why it changed.
- What AI recommendation caused it, if applicable.

---

## FR-024 — Blueprint Comparison

The system should be able to compare:

- Current organization.
- Proposed organization.
- Previous organization.

Example:

> Current Sales team: 7 humans.

> Proposed Sales team: 5 humans + 3 AI employees.

The platform should explain the expected effects.

---

# 9. Organizational Structure

## FR-030 — Departments

Companies must be able to organize work into departments.

A department may contain:

- Human employees.
- AI employees.
- Teams.
- Roles.
- Goals.
- Projects.
- Knowledge.
- Processes.
- Applications.
- Dashboards.

---

## FR-031 — Teams

The system must support task-oriented teams that may exist independently from formal departments.

Example:

**Customer Launch Team**

- Account Manager — human.
- Customer Researcher — AI.
- Technical Consultant — human.
- Documentation Agent — AI.
- Finance Coordinator — human.

---

## FR-032 — Cross-Department Teams

A team must be able to contain members from different departments.

---

## FR-033 — Temporary Teams

The platform should support teams that exist only for a:

- Project.
- Incident.
- Campaign.
- Client.
- Research assignment.
- Product launch.

---

## FR-034 — Reporting Structure

Every worker may have:

- A manager.
- A department manager.
- Project leaders.
- Functional supervisors.

AI employees must always have a responsible authority.

---

# 10. Role System

## FR-040 — Role Definition

A role must describe:

- Purpose.
- Responsibilities.
- Expected outputs.
- Required skills.
- Required knowledge.
- Allowed actions.
- Approval authority.
- Reporting relationship.
- Success measurements.

---

## FR-041 — Human and AI Role Compatibility

A role should define whether it can be occupied by:

- Humans only.
- AI only.
- Either.
- A human/AI combination.

---

## FR-042 — Role Templates

The system should maintain reusable role templates.

Example:

**Customer Research Analyst**

Responsibilities:

- Research prospects.
- Maintain company profiles.
- Identify decision makers.
- Prepare research briefs.
- Flag missing information.

The same role template can be adapted for different companies.

---

# 11. AI Employee System

## FR-050 — AI Employees

The platform must allow a company to create AI employees.

An AI employee is not merely a chatbot.

It must have:

- Name.
- Role.
- Department.
- Responsibilities.
- Manager.
- Goals.
- Skills.
- Knowledge access.
- Tool access.
- Permissions.
- Working instructions.
- Budget.
- Runtime limits.
- Performance history.
- Current assignments.

---

## FR-051 — AI Employee Creation

AI employees may be:

- Created manually.
- Proposed by the Company Compiler.
- Created from templates.
- Created because of detected workload.
- Created temporarily for a project.

---

## FR-052 — AI Employee Job Description

Every AI employee must have a clear job description.

The description should answer:

- Why does this AI employee exist?
- What work should it perform?
- What work should it not perform?
- Who supervises it?
- What decisions can it make?
- What requires human approval?

---

## FR-053 — AI Employee Identity

Every AI employee must have its own identity.

Actions must never appear to have been performed by a human when they were performed by AI.

---

## FR-054 — AI Employee State

An AI employee may be:

- Draft.
- Testing.
- Active.
- Paused.
- Restricted.
- Under review.
- Retired.

---

## FR-055 — AI Employee Onboarding

Before becoming active, an AI employee should complete an onboarding process.

This may include:

- Learning its role.
- Receiving approved skills.
- Receiving approved knowledge.
- Receiving tools.
- Receiving permissions.
- Passing tests.
- Receiving initial tasks.
- Manager approval.

---

## FR-056 — AI Employee Offboarding

When an AI employee is retired:

- Active work must be reassigned.
- Permissions must be removed.
- Credentials must be revoked.
- Scheduled work must stop.
- Knowledge contributions must remain.
- Historical actions must remain attributable.

---

# 12. Background Agents

## FR-060 — Background Agents

The platform must support agents that operate without a user actively talking to them.

Examples:

- Monitor unpaid invoices.
- Research new competitors.
- Check project risks.
- Review document quality.
- Watch regulations.
- Prepare weekly reports.
- Maintain knowledge.
- Detect duplicate records.

---

## FR-061 — Background Agent Ownership

Every background agent must belong to a defined:

- Company.
- Purpose.
- Owner.
- Role or service function.

---

## FR-062 — Visible Background Activity

Users with suitable authority must be able to see:

- Which background agents exist.
- What they are doing.
- When they last ran.
- What they changed.
- What they are waiting for.
- What they cost.
- Whether they failed.

There must be no untraceable "underground" agent activity.

---

# 13. Goals and Objectives

## FR-070 — Company Goals

The platform must support company-level goals.

Examples:

- Reach €10 million annual revenue.
- Enter Germany.
- Reduce support response time to two hours.
- Launch product X.

---

## FR-071 — Goal Breakdown

The AI should be able to break a company goal into:

- Department objectives.
- Projects.
- Tasks.
- Measurements.
- Dependencies.
- Responsible workers.

---

## FR-072 — Goal Relationships

A task should be traceable upward.

Example:

```text
Task
→ Project
→ Department Objective
→ Company Goal
```

This allows humans and AI to understand why work exists.

---

## FR-073 — Goal Monitoring

The platform should continuously compare actual work and results against goals.

It should identify:

- Progress.
- Delays.
- Missing work.
- Conflicting priorities.
- Goals with no active work.
- Work with no clear goal.

---

# 14. Work Management

## FR-080 — Unified Tasks

Humans and AI employees must use the same task system.

A task may be assigned to:

- One human.
- One AI employee.
- Several humans.
- Several AI employees.
- A mixed team.
- A role.
- A department.

---

## FR-081 — Task Content

Tasks should support:

- Description.
- Goal.
- Owner.
- Participants.
- Due date.
- Priority.
- Dependencies.
- Required knowledge.
- Required skills.
- Expected output.
- Approval requirements.
- Related records.
- Comments.
- Work history.

---

## FR-082 — AI Task Planning

An AI employee should be able to break an assigned task into subtasks when permitted.

---

## FR-083 — Task Delegation

An employee or AI employee may delegate work only when permitted.

The delegation record must show:

- Original owner.
- New worker.
- Reason.
- Scope.
- Deadline.

---

## FR-084 — Work Handoffs

The platform must support structured handoffs.

Example:

```text
AI Researcher
→ produces research brief
→ Human Consultant reviews
→ AI Proposal Writer creates draft
→ Human Manager approves
```

---

## FR-085 — Blockers

Humans and AI employees must be able to declare that work is blocked.

The blocker should specify:

- Cause.
- Required help.
- Responsible person or team.
- Impact.
- Urgency.

---

# 15. AI Escalation

## FR-090 — Escalation Rules

AI employees must know when they should stop and ask for help.

Examples:

- Missing information.
- Conflicting policies.
- Permission denied.
- Financial limit exceeded.
- Unusual customer request.
- Legal uncertainty.
- Low confidence.
- Risk of irreversible action.

---

## FR-091 — Escalation Targets

An escalation may go to:

- Manager.
- Department.
- Specialist.
- Task owner.
- Approval group.
- Another AI specialist.

---

## FR-092 — Escalation Context

The AI must provide enough context for the recipient to make a decision without starting the investigation again.

---

# 16. Approval System

## FR-100 — Approval Requirements

Specific actions must be able to require approval.

Examples:

- Sending a contract.
- Spending money.
- Deleting data.
- Publishing content.
- Changing a policy.
- Hiring another AI employee.
- Changing an approved skill.
- Contacting a customer.
- Deploying an application.

---

## FR-101 — Approval Conditions

Approval rules may depend on:

- Action.
- Amount.
- Department.
- Customer.
- Risk.
- Worker type.
- Data sensitivity.
- Confidence score.

---

## FR-102 — AI Approval Requests

AI employees should be able to prepare approval requests containing:

- Proposed action.
- Reason.
- Supporting information.
- Expected result.
- Risk.
- Alternatives.

---

## FR-103 — Approval Outcomes

An approval may be:

- Approved.
- Rejected.
- Returned for changes.
- Delegated.
- Expired.

---

# 17. Delegated Authority

## FR-110 — Delegation

Humans must be able to temporarily delegate authority.

Example:

> The Finance Director allows the Finance AI to approve refunds below €100 for the next 30 days.

The delegation must include:

- Grantor.
- Recipient.
- Scope.
- Limits.
- Start time.
- End time.
- Revocation state.

---

## FR-111 — Delegation Chains

If an AI delegates to another AI agent, the platform must preserve the original authority chain.

---

# 18. Company Knowledge System

## FR-120 — Knowledge Domains

Knowledge must be organized into domains.

Examples:

- Company.
- Products.
- Customers.
- Sales.
- Finance.
- Legal.
- HR.
- Operations.
- Technology.
- Projects.
- Industry research.

---

## FR-121 — Multiple Knowledge Bases

A company must be able to maintain separate knowledge bases.

Example:

```text
Company Knowledge
├── General
├── Management
├── Sales
├── Finance
├── Product
├── Legal
├── Customer A
└── Project X
```

---

## FR-122 — Knowledge Permissions

Knowledge access must follow the worker's authority.

An AI employee should not gain access to information merely because it is technically searchable.

---

## FR-123 — Knowledge Types

The system should distinguish:

- Raw source material.
- Facts.
- Company policies.
- Procedures.
- Guides.
- Research.
- Decisions.
- Templates.
- Lessons learned.
- AI-generated summaries.

---

## FR-124 — Knowledge Provenance

Important knowledge should record:

- Source.
- Creator.
- Date.
- Review state.
- Confidence.
- Related knowledge.
- Effective date.

---

## FR-125 — Knowledge Conflicts

The system should detect when new information conflicts with existing approved information.

It must not silently overwrite the old information.

---

## FR-126 — Knowledge Freshness

Knowledge should support:

- Review dates.
- Expiry dates.
- Freshness status.
- Superseded state.

---

# 19. Company Memory

## FR-130 — Institutional Memory

The platform must preserve important operational history.

Examples:

- Why a decision was made.
- What happened during a project.
- Why a customer exception exists.
- Which strategy was tried.
- What failed.
- What worked.
- What procedure changed.

---

## FR-131 — Memory Promotion

AI conversation memory must not automatically become official company memory.

Useful discoveries should be promoted into structured company knowledge.

---

## FR-132 — Lessons Learned

The system should identify lessons from completed work and propose them for inclusion in company knowledge.

---

# 20. Skills System

## FR-140 — Skills

A skill describes how an AI employee performs a reusable type of work.

Examples:

- Research a prospect.
- Draft a proposal.
- Review an invoice.
- Perform competitive research.
- Analyze a contract.
- Prepare meeting notes.
- Build a dashboard.

---

## FR-141 — Skill Contents

A skill may contain:

- Purpose.
- Instructions.
- Steps.
- Required inputs.
- Expected outputs.
- Tools.
- Knowledge requirements.
- Validation rules.
- Examples.
- Tests.
- Safety rules.

---

## FR-142 — Skill Registry

The company must maintain an official registry of approved skills.

---

## FR-143 — Skill Versions

Skills must support versions.

The system should know which version each AI employee is using.

---

## FR-144 — Skill Improvement

An AI employee may propose an improved skill based on experience.

The proposal should explain:

- Existing problem.
- Proposed improvement.
- Evidence.
- Expected benefit.

---

## FR-145 — Skill Testing

Skills should be testable before company-wide deployment.

---

## FR-146 — Skill Assignment

Skills may be assigned to:

- AI employee.
- Role.
- Department.
- Team.
- Company.

---

# 21. Tools and Capabilities

## FR-150 — Tool Registry

The platform must maintain a registry of tools AI employees can use.

Examples:

- Search.
- Browser.
- Calculator.
- Document editor.
- Email action.
- Database query.
- Code execution.
- Application action.
- File processing.

---

## FR-151 — Tool Permissions

Access to a tool must be separate from access to information.

An AI employee may be allowed to view invoices but not create them.

---

## FR-152 — Action Classification

Actions should support risk categories such as:

- Read-only.
- Reversible write.
- External communication.
- Financial action.
- Destructive action.
- Security-sensitive action.

---

## FR-153 — Tool Restrictions

Tool access may be limited by:

- Role.
- Department.
- Data scope.
- Time.
- Amount.
- Customer.
- Project.
- Approval.

---

# 22. AI Working Context

## FR-160 — Context Assembly

Before performing work, the platform should assemble appropriate context for the AI employee.

Context may include:

- Role.
- Task.
- Goal.
- Relevant knowledge.
- Current project.
- Customer.
- Recent decisions.
- Policies.
- Available tools.
- Permissions.

---

## FR-161 — Minimum Necessary Context

The AI should receive only the information required for its work where possible.

---

## FR-162 — Context Trace

For important work, the platform should be able to show which knowledge and instructions were supplied to the AI.

---

# 23. Human–AI Collaboration

## FR-170 — Shared Workspaces

Humans and AI employees must be able to participate in the same work context.

A workspace may contain:

- Tasks.
- Documents.
- Discussions.
- Decisions.
- Reports.
- Apps.
- Data views.
- AI activity.

---

## FR-171 — AI Mentioning

Users should be able to mention an AI employee in work discussions.

Example:

> @ResearchAI investigate these three competitors and add the results to this project.

---

## FR-172 — Human Mentioning by AI

AI employees should be able to request help from humans.

---

## FR-173 — Work Discussion

Tasks and projects should contain discussions where humans and AI can exchange information.

---

## FR-174 — AI Status

Users should be able to see when an AI employee is:

- Idle.
- Working.
- Waiting.
- Blocked.
- Waiting for approval.
- Failed.
- Paused.

---

## FR-175 — AI Work Preview

Where appropriate, users should be able to inspect intermediate AI work before final action.

---

# 24. Decisions

## FR-180 — Decision Records

Important decisions should be captured separately from normal chat.

A decision should include:

- Decision.
- Context.
- Options considered.
- Decision maker.
- Supporting information.
- Date.
- Related work.

---

## FR-181 — AI Recommendations

AI recommendations should be distinguishable from approved company decisions.

---

# 25. Company Processes

## FR-190 — Process Definitions

Companies must be able to define repeatable business processes.

Examples:

- Customer onboarding.
- Employee onboarding.
- Proposal approval.
- Invoice collection.
- Incident management.
- Product release.
- Customer complaint handling.

---

## FR-191 — Process Steps

A process may contain:

- Human task.
- AI task.
- Automated action.
- Decision.
- Condition.
- Approval.
- Wait.
- Subprocess.
- Notification.

---

## FR-192 — Visual Process Representation

Processes should be viewable visually.

---

## FR-193 — Process Instances

Every running process must have its own instance.

Users should be able to see:

- Current step.
- Completed steps.
- Responsible worker.
- Waiting reason.
- Errors.
- Expected next step.

---

# 26. Automation Engine

## FR-200 — Trigger-Based Work

Actions should be triggerable by events.

Example:

> When a customer complaint is created, start the complaint-resolution process.

---

## FR-201 — Scheduled Work

Work may run according to schedules.

Examples:

- Every morning.
- Every Monday.
- Monthly.
- At quarter end.
- On a specific date.

---

## FR-202 — Conditional Automation

Automation should support conditions.

Example:

```text
IF invoice is overdue by more than 14 days
AND amount > €5,000
THEN create escalation
AND assign Finance AI
AND request manager review
```

---

## FR-203 — Long-Running Work

Processes must be able to wait safely for:

- Human input.
- External event.
- Approval.
- Deadline.
- Another task.

Waiting must not require an AI process to remain continuously running.

---

# 27. AI Planning

## FR-210 — Work Plans

For complex assignments, AI employees should be able to create a proposed plan before execution.

---

## FR-211 — Plan Approval

Managers may require certain AI employees to get approval for a plan before performing it.

---

## FR-212 — Dynamic Replanning

AI employees should be able to modify a plan when circumstances change, subject to their authority.

---

# 28. Multi-Agent Work

## FR-220 — Specialist Agents

An AI employee should be able to call specialist agents when allowed.

Example:

```text
Sales AI
├── Research specialist
├── Pricing specialist
└── Proposal specialist
```

---

## FR-221 — Temporary Subagents

Subagents may be created temporarily for a specific task.

---

## FR-222 — Authority Inheritance

A subagent may never receive greater authority than the AI employee that created it unless separately authorized.

---

## FR-223 — Subagent Attribution

The final record must show which agent performed each important action.

---

# 29. AI Performance Management

## FR-230 — AI Performance Metrics

The platform should measure AI employees based on their role.

Possible measurements include:

- Tasks completed.
- Quality.
- Accuracy.
- Rework.
- Approval rate.
- Escalation rate.
- Cost.
- Time.
- Goal contribution.
- User satisfaction.

---

## FR-231 — Role-Specific Evaluation

Different roles require different measurements.

A writing AI should not be evaluated in the same way as a finance-monitoring AI.

---

## FR-232 — Performance Reviews

AI employees should support scheduled performance reviews.

The review may recommend:

- Keep unchanged.
- Improve skills.
- Change instructions.
- Reduce permissions.
- Increase permissions.
- Change model.
- Change role.
- Pause.
- Retire.

---

# 30. AI Evaluation and Testing

## FR-240 — AI Test Scenarios

The company must be able to maintain test scenarios for important AI roles.

---

## FR-241 — Pre-Deployment Testing

New AI employees, instructions, skills, and major changes should be testable before activation.

---

## FR-242 — Regression Testing

When an AI employee or skill changes, existing test scenarios should be rerunnable to detect lost capabilities.

---

## FR-243 — Evaluation Records

The platform should retain:

- Test.
- Input.
- Output.
- Expected result.
- Actual result.
- Score.
- Version tested.

---

# 31. AI Budgets and Resource Limits

## FR-250 — AI Budgets

AI employees may have budgets.

Budget may be defined by:

- Day.
- Month.
- Project.
- Department.
- Task.

---

## FR-251 — Budget Rules

The platform should support:

- Warning limits.
- Hard limits.
- Approval for extra spending.
- Different limits by AI employee.

---

## FR-252 — Cost Attribution

AI costs should be attributable to:

- Employee.
- Department.
- Project.
- Customer.
- Task.

---

# 32. Internal Data Objects

## FR-260 — Custom Data Objects

The platform must allow companies to define structured data objects.

Examples:

- Customer.
- Contract.
- Property.
- Machine.
- Vehicle.
- Case.
- Candidate.
- Inspection.
- Shipment.
- Compliance Control.

---

## FR-261 — Custom Fields

Objects may contain fields such as:

- Text.
- Number.
- Currency.
- Date.
- Status.
- Person.
- Relation.
- File.
- Formula.
- AI-generated value.

---

## FR-262 — Relationships

Objects must be able to relate to each other.

Example:

```text
Company
→ Contacts
→ Contracts
→ Projects
→ Invoices
```

---

## FR-263 — Object Permissions

Data-object access must support the same organizational and AI permission model as the rest of the platform.

---

# 33. Internal Application Builder

## FR-270 — Native App Builder

The platform should allow internal applications to be created without leaving the company environment.

---

## FR-271 — AI App Creation

Users should be able to describe an application in normal language.

Example:

> Create an equipment inspection application for our field technicians.

The AI should propose:

- Data objects.
- Fields.
- Forms.
- Views.
- Workflows.
- Permissions.
- Dashboards.

---

## FR-272 — Declarative Applications

The first application type should be built from safe platform components rather than arbitrary code.

Available components may include:

- Forms.
- Tables.
- Boards.
- Cards.
- Timelines.
- Calendars.
- Charts.
- Buttons.
- Filters.
- Search.
- Related records.

---

## FR-273 — App Logic

Apps should support rules such as:

- Required fields.
- Calculations.
- Validation.
- Conditional visibility.
- Status transitions.
- Approval.
- Automation.

---

## FR-274 — App Actions

An application can expose approved actions.

Example:

- Approve.
- Assign.
- Escalate.
- Generate report.
- Create follow-up.
- Run AI analysis.

---

# 34. Micro-App Builder

## FR-280 — Micro-Apps

The platform should support small applications created for a specific business need.

Examples:

- Customer health checker.
- Quote calculator.
- Risk assessment.
- Project profitability tool.
- Employee equipment request.
- Supplier review.
- Meeting preparation tool.

---

## FR-281 — Temporary Apps

Some micro-apps may exist only for a project or campaign.

---

## FR-282 — AI Modification

Authorized users should be able to ask AI to modify an app.

Example:

> Add a risk score and show critical suppliers at the top.

---

## FR-283 — App Versions

Apps must support versioning and rollback.

---

# 35. Generated Code Applications

## FR-290 — Advanced Code Applications

The platform may support applications requiring generated custom code.

These applications must be treated differently from declarative platform apps.

---

## FR-291 — Controlled Deployment

Generated applications must pass through:

- Build.
- Automated testing.
- Security checks.
- Review where required.
- Deployment.
- Monitoring.

---

## FR-292 — Application Capabilities

Generated applications should receive only explicitly granted access to company data and actions.

---

# 36. Dashboards

## FR-300 — Company Dashboards

The platform must support dashboards combining information from company operations.

---

## FR-301 — Department Dashboards

Departments should have dashboards relevant to their work.

---

## FR-302 — AI-Generated Dashboards

Users should be able to request dashboards in normal language.

Example:

> Show me a dashboard for customer retention, open complaints, high-risk customers, and overdue follow-ups.

---

## FR-303 — Interactive Dashboards

Dashboard elements should allow filtering and navigation to underlying information.

---

# 37. Reporting

## FR-310 — Reports

The system must support:

- Standard reports.
- Scheduled reports.
- AI-written reports.
- Data tables.
- Charts.
- Narrative analysis.

---

## FR-311 — AI Report Generation

AI should be able to explain what happened and why.

Example:

> Sales increased 12% mainly because of customer renewals in Sweden, while new customer acquisition fell 7%.

---

## FR-312 — Report Evidence

AI-generated business reports must be able to show the data used to produce important claims.

---

## FR-313 — Report Distribution

Reports may be produced for:

- Management.
- Department.
- Team.
- Customer.
- Project.
- Individual worker.

---

# 38. Company Intelligence

## FR-320 — Company-Wide Questions

Authorized users should be able to ask questions across the company.

Examples:

- What projects are at risk?
- Why did sales decline?
- Which customers have not been contacted recently?
- What are our biggest operational bottlenecks?
- What changed this week?
- Which AI employees are underperforming?

---

## FR-321 — Evidence-Based Answers

Answers should indicate their supporting information.

---

## FR-322 — Permission-Aware Answers

Company intelligence must only use information the requesting actor is allowed to access.

---

# 39. Universal Search

## FR-330 — Unified Search

The platform should provide one search experience across:

- Knowledge.
- Tasks.
- Projects.
- People.
- AI employees.
- Applications.
- Reports.
- Decisions.
- Company records.

---

## FR-331 — Semantic Search

Search should understand meaning, not only exact words.

---

## FR-332 — Relationship Search

Users should be able to navigate relationships.

Example:

```text
Customer
→ meetings
→ contracts
→ projects
→ tasks
→ responsible employees
→ reports
```

---

# 40. Company Assistant

## FR-340 — Company-Level AI Assistant

The platform should provide an AI that understands the company as a whole.

This AI is not necessarily an employee inside one department.

It helps users interact with the operating system.

---

## FR-341 — Company Assistant Functions

The assistant should be able to:

- Find information.
- Explain company structure.
- Find work.
- Create tasks.
- Suggest AI employees.
- Suggest applications.
- Suggest processes.
- Analyze company problems.
- Prepare reports.
- Navigate the platform.
- Identify missing structure.

---

## FR-342 — No Unlimited Authority

The company assistant must still obey the authority of the requesting user.

---

# 41. Operational Monitoring

## FR-350 — Activity Overview

Managers should be able to see:

- Active human work.
- Active AI work.
- Background agent activity.
- Waiting approvals.
- Blocked work.
- Failed processes.
- Major risks.

---

## FR-351 — AI Operations Center

The platform should provide a dedicated view for AI workforce operations.

It should show:

- Active AI employees.
- Current tasks.
- Runtime state.
- Cost.
- Failures.
- Escalations.
- Approval requests.
- Recent actions.

---

## FR-352 — Process Monitoring

Users should be able to inspect long-running company processes and determine exactly where they are waiting or failing.

---

# 42. AI Activity History

## FR-360 — Full AI Activity History

Important AI activity must be recorded.

The record should include:

- AI employee.
- Task.
- Action.
- Time.
- Result.
- Tools used.
- Approvals.
- Important inputs.
- Important outputs.

---

## FR-361 — Human Intervention

The system must record when a human:

- Changes AI output.
- Stops AI work.
- Overrides an AI decision.
- Approves an AI action.
- Rejects an AI action.

---

# 43. Explainability

## FR-370 — Explain Important Actions

For important actions, users should be able to ask:

> Why did you do this?

The AI should explain:

- Task.
- Relevant instruction.
- Relevant knowledge.
- Decision.
- Action.

---

## FR-371 — Confidence

Where useful, AI-generated findings should show uncertainty rather than presenting everything as certain.

---

# 44. Failure Handling

## FR-380 — AI Failure

If an AI employee cannot complete work, it must not pretend it succeeded.

The system should clearly record:

- Failed.
- Partially completed.
- Blocked.
- Waiting for input.

---

## FR-381 — Recovery

Failed work should support:

- Retry.
- Continue.
- Reassign.
- Human takeover.
- AI takeover by another agent.

---

# 45. Work Continuity

## FR-390 — Persistent Work

AI tasks must survive:

- Browser closing.
- User logout.
- Worker restart.
- Temporary system interruption.

---

## FR-391 — Resume Context

An AI employee returning to unfinished work must be able to recover the relevant task context.

---

# 46. Company Templates

## FR-400 — Company Templates

The platform should support reusable company templates.

Examples:

- Consulting company.
- Law firm.
- Marketing agency.
- Software company.
- Construction company.
- Retail company.

---

## FR-401 — Template Contents

A template may contain:

- Suggested departments.
- Roles.
- AI employees.
- Skills.
- Knowledge structures.
- Processes.
- Data objects.
- Apps.
- Dashboards.
- Reports.

---

## FR-402 — Template Adaptation

Templates must be starting points, not fixed installations.

AI should adapt the template to the individual company.

---

# 47. Industry Packs

## FR-410 — Industry Packs

The platform should support industry-specific operating knowledge.

An industry pack may contain:

- Terminology.
- Common roles.
- Common processes.
- Common KPIs.
- Common risks.
- Common applications.
- Research sources.
- Skill templates.

---

# 48. Continuous Company Improvement

## FR-420 — Organizational Analysis

The AI should periodically analyze the company for improvement opportunities.

Examples:

- Too much manual work.
- Repeated errors.
- Unclear ownership.
- Knowledge gaps.
- Tasks frequently delayed.
- Excessive approvals.
- Underused AI employees.
- Missing automation.
- Duplicate processes.

---

## FR-421 — Improvement Proposals

The system should create proposals rather than silently restructure the company.

---

## FR-422 — Impact Analysis

A proposed change should explain expected effects.

Example:

> Automating this process may remove approximately 18 hours of repetitive work per month but requires manager review for payments above €1,000.

---

# 49. Company Simulation

## FR-430 — Proposed-Change Simulation

Where possible, the system should simulate major organizational changes before activation.

Examples:

- Add AI employee.
- Remove process step.
- Change approval authority.
- Automate workflow.
- Reassign department responsibilities.

---

# 50. AI Hiring Recommendations

## FR-440 — Workload Analysis

The platform should identify areas where an additional AI employee may be useful.

---

## FR-441 — AI Hiring Proposal

A proposal should contain:

- Proposed role.
- Reason.
- Responsibilities.
- Required skills.
- Required knowledge.
- Estimated workload.
- Estimated cost.
- Expected benefit.
- Required supervision.

---

# 51. AI Workforce Marketplace Inside a Company

## FR-450 — Reusable AI Templates

Companies should be able to maintain internal reusable AI employee templates.

Example:

- Research Analyst.
- Proposal Writer.
- Accounts Receivable Assistant.
- Compliance Researcher.

---

## FR-451 — Clone and Adapt

A template may be cloned and adapted for:

- Department.
- Project.
- Customer.
- Country.
- Business unit.

---

# 52. Work Policies

## FR-460 — Work Policies

The platform must support rules affecting how work is performed.

Examples:

- Contracts require legal approval.
- Customer data cannot be used outside the customer team.
- AI cannot publish directly.
- Refunds over €500 require finance approval.
- Security incidents must be escalated immediately.

---

## FR-461 — Policy Enforcement

Policies should be applied during work rather than existing only as text documents.

---

# 53. Data Sensitivity

## FR-470 — Information Classification

Company information should support classifications such as:

- Public.
- Internal.
- Confidential.
- Restricted.

---

## FR-471 — AI Data Limits

AI employees may have restrictions regarding which classifications they can access or process.

---

# 54. Safe AI Actions

## FR-480 — Read versus Write

Permissions must distinguish between:

- Reading information.
- Creating information.
- Updating information.
- Deleting information.
- Sending information outside the company.

---

## FR-481 — Reversible Actions

Where possible, AI-generated changes should be reversible.

---

## FR-482 — Destructive Actions

Destructive or irreversible actions should support stronger approval requirements.

---

# 55. Application and AI Interaction

## FR-490 — AI-Readable Applications

Every native application should expose enough structured information for authorized AI employees to understand and operate it.

AI should not need to visually imitate mouse clicks whenever structured application actions are available.

---

## FR-491 — AI Actions in Apps

Applications should be able to expose actions to AI employees according to their permissions.

---

## FR-492 — AI Assistance Inside Apps

Users should be able to request AI help within an application.

Example:

> Summarize this customer.

> Complete this record from the attached documents.

> Identify missing information.

---

# 56. AI-Generated Data Fields

## FR-500 — AI Fields

Structured applications may contain fields calculated or proposed by AI.

Examples:

- Customer risk.
- Opportunity summary.
- Recommended next action.
- Contract concerns.
- Project health.

---

## FR-501 — AI Value Provenance

AI-generated values should be identifiable as AI-generated where this matters.

---

# 57. Notifications as Work Signals

## FR-510 — Intelligent Attention

The platform should avoid notifying users about every AI action.

It should prioritize situations requiring attention.

Examples:

- Approval required.
- Critical blocker.
- AI failure.
- High-risk finding.
- Deadline risk.
- Important goal change.

---

# 58. Personal Work Assistant

## FR-520 — Personal Work View

Each worker should have a work view showing:

- Current tasks.
- Priorities.
- Approvals.
- Mentions.
- AI requests.
- Deadlines.
- Relevant updates.

---

## FR-521 — Personal AI Assistance

A human worker may have AI assistance that understands:

- Their role.
- Their current work.
- Their authorized knowledge.
- Their responsibilities.

---

# 59. Manager AI Assistance

## FR-530 — Management Analysis

Managers should be able to ask:

- Who is overloaded?
- Which tasks are blocked?
- Which AI employees need review?
- Which goals have no active work?
- Which processes are failing?

---

## FR-531 — Management Recommendations

AI may recommend:

- Reassignment.
- New automation.
- New AI employee.
- Skill improvement.
- Process change.
- Knowledge improvement.

Recommendations must remain proposals until accepted where authority requires.

---

# 60. Department Intelligence

## FR-540 — Department AI Context

Each department may maintain its own specialized AI context.

Example:

Finance AI should understand finance procedures without automatically receiving legal or HR confidential data.

---

# 61. Project Intelligence

## FR-550 — Project Brain

Projects should be able to maintain their own context containing:

- Goals.
- Participants.
- Decisions.
- Tasks.
- Documents.
- Knowledge.
- Issues.
- Reports.

AI working on the project should use this context.

---

# 62. Customer or Case Contexts

## FR-560 — Isolated Business Contexts

The platform should support contexts such as:

- Customer.
- Client engagement.
- Legal case.
- Property.
- Product.
- Supplier.

Relevant tasks, knowledge, people, and AI employees can operate within these contexts.

---

# 63. Temporary AI Teams

## FR-570 — AI Team Creation

The system should be able to assemble temporary specialist teams for complex work.

Example:

```text
Acquisition Analysis Team
├── Financial Analyst AI
├── Legal Research AI
├── Market Research AI
└── Human Strategy Director
```

---

## FR-571 — Team Dissolution

Temporary teams should be removable after work ends without losing their work history.

---

# 64. AI-to-AI Communication

## FR-580 — Structured Agent Communication

AI employees should communicate using structured work messages rather than uncontrolled free conversation where possible.

A message may include:

- Request.
- Context.
- Expected output.
- Deadline.
- Authority.
- Related task.

---

# 65. AI Initiative

## FR-590 — Proactive Work

AI employees may initiate work when their role permits it.

Example:

A Compliance AI detects a regulatory change and creates a review task.

---

## FR-591 — Initiative Limits

Proactive AI work must stay inside:

- Role.
- Budget.
- Permission.
- Knowledge scope.
- Policy.

---

# 66. Company Change Management

## FR-600 — Change Proposals

Important company changes should support structured proposals.

---

## FR-601 — Change Impact

The system should identify affected:

- Roles.
- Employees.
- AI employees.
- Skills.
- Processes.
- Apps.
- Knowledge.
- Reports.

---

## FR-602 — Controlled Activation

Large changes should be activatable at a planned time rather than immediately.

---

# 67. Versioning

## FR-610 — Version Important Assets

The following should support versioning where applicable:

- Company Blueprint.
- Skills.
- Policies.
- Processes.
- Apps.
- AI instructions.
- Role definitions.
- Knowledge procedures.

---

## FR-611 — Rollback

Where technically possible, the company should be able to restore a previous approved version.

---

# 68. Audit and Traceability

## FR-620 — Cross-System Activity Record

An important business action may involve many internal components.

The platform should connect those activities under one trace.

Example:

```text
Customer becomes ready for onboarding
→ process starts
→ AI researcher assigned
→ research created
→ human approves
→ workspace created
→ onboarding app initialized
```

---

## FR-621 — Audit Search

Authorized users should be able to search important operational history.

---

# 69. Privacy of Reasoning

## FR-630 — Useful Explanation, Not Internal Scratch Work

The system should preserve:

- Decisions.
- Evidence.
- Actions.
- Important rationale.

It does not need to expose every internal model token or private reasoning step.

---

# 70. Operational Metrics

## FR-640 — Company Operating Metrics

The platform should generate metrics covering both human and AI work.

Examples:

- Task throughput.
- Cycle time.
- Goal progress.
- Process bottlenecks.
- Approval delays.
- AI cost.
- AI rework.
- Escalation frequency.
- Knowledge freshness.

---

# 71. AI Cost Management

## FR-650 — Cost Reporting

Management should be able to see AI operating cost by:

- Company.
- Department.
- Employee.
- Task.
- Project.
- Skill.
- Customer.

---

## FR-651 — Cost versus Value

Where possible, the system should compare AI cost with measurable output.

---

# 72. System Extensibility

## FR-660 — Module Framework

New native modules should be capable of registering:

- Data objects.
- Views.
- Actions.
- AI capabilities.
- Permissions.
- Events.
- Search providers.
- Dashboard elements.

---

## FR-661 — Capability Contracts

AI employees should work through stable capabilities rather than knowing internal implementation details.

Example:

```text
customer.read
customer.update
invoice.create
document.search
report.generate
```

The underlying implementation may later change without changing the AI employee's role definition.

---

# 73. Event Model

## FR-670 — Company Events

Important changes should create structured events.

Examples:

- TaskCreated.
- TaskCompleted.
- CustomerCreated.
- ApprovalRequested.
- ApprovalGranted.
- AIEmployeePaused.
- SkillUpdated.
- KnowledgeSuperseded.

---

## FR-671 — Event Consumers

Processes, applications, dashboards, and background agents may react to events.

---

# 74. Data Ownership

## FR-680 — Authoritative Records

Every important data type should have a clearly defined authoritative owner inside the platform.

There should not be two equally authoritative copies of the same business record.

---

# 75. AI Security Requirements

## NFR-001 — Least Privilege

AI employees must receive only the access required for their jobs.

---

## NFR-002 — No Shared Superuser AI

The platform must not use one unrestricted AI identity for all AI operations.

---

## NFR-003 — Secret Protection

AI employees should receive access to actions without unnecessary exposure of raw credentials.

---

## NFR-004 — Tool Isolation

Risky tools such as code execution must operate in appropriately isolated environments.

---

## NFR-005 — Generated Application Isolation

Custom generated code must not automatically inherit unrestricted access to company information.

---

# 76. Reliability Requirements

## NFR-010 — Durable Work

Long-running business work must survive normal system interruptions.

---

## NFR-011 — Idempotent Actions

The platform should avoid performing the same external or irreversible action multiple times because of retries.

---

## NFR-012 — Retry Management

Temporary failures should be retryable.

Permanent failures should not retry forever.

---

## NFR-013 — Dead Work Handling

Failed automated work should enter a visible state where authorized users can inspect and recover it.

---

# 77. Performance Requirements

## NFR-020 — Interactive Response

Normal interactive screens should respond without unnecessary delay.

---

## NFR-021 — Background Processing

Long AI operations should run as background work rather than freezing the user interface.

---

## NFR-022 — Large Company Support

The design must support companies with:

- Thousands of human workers.
- Large numbers of AI workers.
- Large knowledge collections.
- Many concurrent workflows.
- Large task histories.

---

# 78. Transparency Requirements

## NFR-030 — AI Identification

Users must be able to distinguish between:

- Human-created.
- AI-created.
- AI-suggested.
- AI-approved through delegated authority.

---

## NFR-031 — Action Attribution

Every important write action must have an actor.

---

## NFR-032 — Source Visibility

AI research and important factual recommendations should preserve evidence where possible.

---

# 79. Portability Requirements

## NFR-040 — Company Export

The platform should eventually support exporting important company definitions such as:

- Organization structure.
- Roles.
- Skills.
- Processes.
- Policies.
- Knowledge.
- Data-object definitions.
- App definitions.
- AI employee definitions.

---

## NFR-041 — No Hidden Company Logic

Critical company behavior should not exist only inside undocumented prompts.

Important operating logic should exist as inspectable platform assets.

---

# 80. Typical Company Creation Journey

A new company may follow this journey:

### Step 1 — Describe the company

The founder explains the business.

### Step 2 — AI discovery

The platform asks additional questions.

### Step 3 — Research

The AI studies the industry, market, risks, and common operating patterns.

### Step 4 — Draft Company Blueprint

The system proposes:

- Departments.
- Roles.
- Teams.
- AI employees.
- Knowledge structure.
- Processes.
- Applications.
- Dashboards.
- Metrics.

### Step 5 — Human review

Management reviews and changes the proposal.

### Step 6 — Knowledge creation

The AI builds initial company and industry knowledge.

### Step 7 — AI workforce creation

Selected AI employees are created.

### Step 8 — Skills assignment

Each AI employee receives approved skills.

### Step 9 — Evaluation

AI employees are tested.

### Step 10 — Process activation

Approved workflows and background agents are activated.

### Step 11 — Daily operation

Humans and AI begin working together.

### Step 12 — Continuous improvement

The platform observes performance and proposes improvements.

---

# 81. Example: AI Employee Lifecycle

```text
Need identified
       ↓
Role proposed
       ↓
Manager reviews
       ↓
AI employee created
       ↓
Knowledge assigned
       ↓
Skills assigned
       ↓
Tools assigned
       ↓
Permissions assigned
       ↓
Tests executed
       ↓
Manager approval
       ↓
Active employment
       ↓
Performance monitoring
       ↓
Improvement / retraining
       ↓
Pause / role change / retirement
```

---

# 82. Example: Human–AI Project

A company starts a new market-entry project.

The project contains:

**Human Strategy Director**

Responsible for final strategic decisions.

**Market Research AI**

Researches the target country.

**Legal Research AI**

Identifies legal requirements.

**Financial Analyst AI**

Builds financial scenarios.

**Human Finance Manager**

Reviews financial assumptions.

**Report Writer AI**

Produces the final draft report.

All participants use the same:

- Project.
- Tasks.
- Knowledge.
- Discussions.
- Decisions.
- Deliverables.

The AI employees do not operate as a separate system.

---

# 83. Example: Background Business Operation

A Finance Monitoring AI runs every morning.

It:

1. Reviews overdue payments.
2. Identifies high-value cases.
3. Checks recent customer communication.
4. Prepares recommended next actions.
5. Creates tasks.
6. Drafts communications.
7. Escalates high-risk cases.
8. Waits for approval where required.

Management can inspect every action.

---

# 84. Example: Company Improvement

The platform detects:

- Customer onboarding averages 11 days.
- The same information is entered three times.
- Two approvals rarely result in rejection.
- Employees repeatedly ask the same questions.
- One AI assistant could automate document preparation.

The system proposes:

1. Create a shared onboarding data object.
2. Remove one unnecessary approval.
3. Create an onboarding knowledge base.
4. Add an AI onboarding coordinator.
5. Build an onboarding dashboard.

Management can accept individual recommendations rather than accepting the entire proposal.

---

# 85. Product Areas That Should Feel Native

Even if we later decide to satisfy some requirements through external or adapted systems, the following must appear to users as one product:

- Company structure.
- Human workforce.
- AI workforce.
- Goals.
- Work.
- Projects.
- Knowledge.
- Skills.
- Processes.
- Approvals.
- Internal applications.
- Dashboards.
- Reporting.
- AI activity.
- Company intelligence.

Users should not need to understand which technical subsystem provides each feature.

---

# 86. Functional Boundary for Future Architecture Decisions

This SRS intentionally separates **what the product must do** from **how we implement it**.

Each requirement can therefore later receive one of the following implementation decisions:

### A — Native Core

We design and code it because it defines the product.

Likely examples:

- Company Blueprint.
- Human/AI organization model.
- Company Compiler.
- AI employee lifecycle.
- Company-wide permission context.
- Skills governance.
- Human–AI work model.
- Company intelligence.
- Unified application model.

### B — Native Code Using External Logic

We reproduce or adapt proven algorithms and patterns from permissively licensed projects while keeping the resulting functionality inside our architecture.

### C — Embedded Library or Framework

A library handles a technical capability but does not become a separate visible product.

### D — Internal Service

A separate internal engine performs a specialized function but remains invisible behind our platform APIs.

### E — Integrated Product

A complete specialized application remains separate underneath but is presented through the main platform.

The decision between A–E must be made **after this functional SRS**, not before it.

---

# 87. Definition of Product Completion

The platform should be considered functionally complete for its unique purpose when a company can:

1. Describe itself to the platform.
2. Allow AI to research its environment.
3. Generate a useful Company Blueprint.
4. Define departments and teams.
5. Define roles shared by humans and AI.
6. Create and supervise AI employees.
7. Build company knowledge.
8. Create and govern AI skills.
9. Assign work to humans and AI together.
10. Operate background agents.
11. Run long-running company processes.
12. Require human approvals where appropriate.
13. Create internal data structures.
14. Generate internal applications.
15. Generate dashboards and reports.
16. Ask questions across authorized company information.
17. Track goals down to individual work.
18. Evaluate AI employees.
19. Measure AI cost and performance.
20. Preserve company memory.
21. Improve procedures and skills over time.
22. Propose organizational improvements.
23. Preserve a full record of important AI actions.
24. Keep company authority, permissions, and human accountability intact.

At that point, the product is no longer simply an AI assistant platform.

It is a **company operating environment where humans, AI employees, company knowledge, processes, applications, and management operate as parts of the same system**.