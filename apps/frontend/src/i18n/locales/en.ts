const translations: Record<string, string> = {
  // ============================================================
  // Common — shared labels
  // ============================================================
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.add': 'Add',
  'common.edit': 'Edit',
  'common.create': 'Create',
  'common.close': 'Close',
  'common.loading': 'Loading...',
  'common.remove': 'Remove',
  'common.connect': 'Connect',
  'common.test': 'Test',
  'common.refresh': 'Refresh',
  'common.new': 'New',
  'common.noData': 'No data',
  'common.optional': 'optional',
  'common.default': 'Default',
  'common.enabled': 'Enable',
  'common.disabled': 'Disable',
  'common.active': 'Active',
  'common.inactive': 'Inactive',
  'common.error': 'Error',
  'common.system': 'System',
  'common.result': 'Result',
  'common.preview': 'Preview',
  'common.export': 'Export',
  'common.import': 'Import',
  'common.start': 'Start',
  'common.stop': 'Stop',
  'common.template': 'Template',
  'common.search': 'Search',

  // ============================================================
  // App.tsx — main layout
  // ============================================================
  'app.title': 'Agent Simit',
  'app.emptyState': 'Select an office from the left or create a new one.',

  // ============================================================
  // Sidebar — OfficeSidebar.tsx
  // ============================================================
  'sidebar.offices': 'Offices',
  'sidebar.agentCount': '{{count}} agents',
  'sidebar.activeCount': '({{count}} active)',
  'sidebar.projectCount': '{{count}} projects',
  'sidebar.runningSessionsCount': '{{count}} Claude sessions running',
  'sidebar.tasks': 'Tasks',
  'sidebar.noOffice': 'No offices yet',
  'sidebar.newOffice': '+ New Office',
  'sidebar.officeName': 'Office name...',
  'sidebar.officeDesc': 'Description (optional)...',
  'sidebar.createOffice': 'Create',
  'sidebar.demoProject': 'Setup Demo Project',
  'sidebar.demoProjectLoading': 'Setting up...',
  'sidebar.demoProjectTitle': 'Creates a demo office with 5 agents, Tic Tac Toe project, tasks, skills, subagent, hooks and team',
  'sidebar.demoLight': '⚡ Light Demo',
  'sidebar.demoLightTitle': '2-agent light demo — Notepad API, 3 tasks, compact context mode (low token usage)',
  'sidebar.demoFull': '🏗️ Full Demo',
  'sidebar.resetDb': 'Reset Database',
  'sidebar.resetDbLoading': 'Resetting...',
  'sidebar.resetDbTitle': 'Reset entire database — offices, agents, projects, skills, subagents, hooks, teams',
  'sidebar.templateButton': 'Add ready-made team template',

  // Confirm dialogs (sidebar)
  'confirm.resetDb': 'Are you sure you want to reset the entire database?\n\nThis action cannot be undone. All offices, agents, projects, tasks, skills, subagents, hooks, teams and MCP servers will be deleted.',
  'confirm.deleteOffice': 'Are you sure you want to delete the "{{name}}" office? All agents and projects will be deleted.',
  'confirm.deleteAgent': 'Are you sure you want to delete the agent "{{name}}"?',
  'confirm.deleteProject': 'Are you sure you want to delete the "{{name}}" project?\nAll tasks will also be deleted.',
  'confirm.deleteSkill': 'This skill will be deleted. Are you sure?',

  // ============================================================
  // Theme labels — OfficeView.tsx THEMES
  // ============================================================
  'theme.light': 'Light',
  'theme.dark': 'Dark',

  // ============================================================
  // Office — OfficeView.tsx
  // ============================================================
  'office.projects': 'Projects',
  'office.dashboard': 'Dashboard',
  'office.replay': 'Replay',
  'office.help': 'Help',
  'office.emptyTitle': 'Office is empty!',
  'office.emptyDesc': 'Add a new agent using the + button below.',
  'office.workRoom': 'Work Room',
  'office.coffeeCorner': 'Coffee Corner',
  'office.meetingRoom': 'Meeting Room',
  'office.emptyWorkRoom': 'Nobody is working right now',
  'office.emptyCoffeeCorner': 'Everyone is working!',
  'office.emptyMeetingRoom': 'No meetings',
  'office.agentProjectStats': '{{agentCount}} agents \u00a0·\u00a0 {{projectCount}} projects',
  'office.workingCount': '{{count}} working',

  // ============================================================
  // Agent Desk — AgentDesk.tsx
  // ============================================================
  'agent.claudeCodeActive': 'Claude Code active',
  'agent.jsonlWatching': 'Watching JSONL',

  // ============================================================
  // Status labels — from @smith/types STATUS_LABELS
  // ============================================================
  'status.idle': 'Idle',
  'status.thinking': 'Thinking',
  'status.typing': 'Typing',
  'status.reading': 'Reading',
  'status.waiting': 'Waiting',
  'status.celebrating': 'Completed!',

  // ============================================================
  // Team status labels — from @smith/types
  // ============================================================
  'status.team.idle': 'Ready',
  'status.team.running': 'Running',
  'status.team.completed': 'Completed',
  'status.team.error': 'Error',

  // ============================================================
  // Teammate status labels — from @smith/types
  // ============================================================
  'status.teammate.idle': 'Idle',
  'status.teammate.working': 'Working',
  'status.teammate.done': 'Completed',
  'status.teammate.error': 'Error',

  // ============================================================
  // Worktree status labels — from @smith/types
  // ============================================================
  'status.worktree.active': 'Active',
  'status.worktree.merged': 'Merged',
  'status.worktree.conflict': 'Conflict',
  'status.worktree.deleted': 'Deleted',

  // ============================================================
  // Isolation mode labels — from @smith/types
  // ============================================================
  'isolation.shared': 'Shared (Default)',
  'isolation.worktree': 'Worktree Isolation',

  // ============================================================
  // Project status labels — ProjectPanel.tsx
  // ============================================================
  'project.status.planning': 'Planning',
  'project.status.active': 'Active',
  'project.status.review': 'Review',
  'project.status.done': 'Completed',

  // ============================================================
  // Conversation — ConversationPanel.tsx
  // ============================================================
  'conversation.activity': 'Activity',
  'conversation.filterAll': 'All',
  'conversation.filterClaude': 'Claude',
  'conversation.filterTool': 'Tool',
  'conversation.filterTask': 'Task',
  'conversation.filterResult': 'Result',
  'conversation.filterSystem': 'System',
  'conversation.filterTitle': 'Filter {{label}} messages',

  // Message type labels
  'conversation.msgChat': 'Message',
  'conversation.msgTask': 'Task',
  'conversation.msgResult': 'Result',
  'conversation.msgSystem': 'System',
  'conversation.msgClaude': 'Claude',
  'conversation.msgTool': 'Tool',
  'conversation.msgError': 'Error',

  // Tool parse labels
  'conversation.toolWriting': 'Writing: ',
  'conversation.toolEditing': 'Editing: ',
  'conversation.toolReading': 'Reading: ',
  'conversation.toolUsing': 'using',
  'conversation.toolRunning': 'running...',
  'conversation.toolSubtask': 'Subtask: ',

  // Handoff card
  'conversation.handoffTitle': 'Task Chain Triggered',
  'conversation.handoffBadge': 'Automatic',

  // Completion card
  'conversation.completed': 'Completed!',

  // Agent-to-Agent card
  'conversation.agentToAgent': 'Agent→Agent',

  // Approval cards
  'conversation.approvalRequest': 'Requesting Approval',
  'conversation.approvalResponse': 'Approval Response',
  'conversation.approved': 'Approved',
  'conversation.rejected': 'Rejected',
  'conversation.approvalPending': 'Pending',
  'conversation.approvalResponded': 'Responded',
  'conversation.approve': 'Approve',
  'conversation.reject': 'Reject',

  // Message actions
  'conversation.collapse': 'Collapse',
  'conversation.showAll': 'Show all',

  // Empty states
  'conversation.noConnection': 'No connection',
  'conversation.noMsgType': 'No messages of this type',
  'conversation.noActivity': 'No activity yet',
  'conversation.noActivityHint': 'Edit an agent and connect a JSONL from the Claude Code tab, or start a session',

  // Footer
  'conversation.liveConnection': 'Live connection active',
  'conversation.disconnected': 'Disconnected',
  'conversation.agentsWorking': '{{count}} agents working',

  // ============================================================
  // Agent Modal — AgentModal.tsx
  // ============================================================
  'agent.editTitle': 'Edit {{name}}',
  'agent.addTitle': 'Add New Agent',
  'agent.nameRequired': 'Name and role are required.',

  // Tabs
  'agent.tabProfile': 'Profile',
  'agent.tabAdvanced': 'Advanced',
  'agent.tabSkills': 'Skills',
  'agent.tabMcp': 'MCP',
  'agent.tabSubagent': 'Subagent',
  'agent.tabTraining': 'Training',
  'agent.tabSession': 'Claude Code',
  'agent.tabTranscript': 'Transcript',

  // Profile tab
  'agent.selectCharacter': 'Select Character',
  'agent.agentName': 'Agent Name',
  'agent.agentNamePlaceholder': 'e.g. Mehmet, Alex, Luna...',
  'agent.role': 'Role / Expertise',
  'agent.rolePlaceholder': 'e.g. Backend Dev, Project Manager, QA...',
  'agent.model': 'Claude Model',
  'agent.modelDefault': 'Default (claude-sonnet-4-6)',
  'agent.modelOpus': 'Claude Opus 4.6 (most powerful)',
  'agent.modelSonnet': 'Claude Sonnet 4.6 (balanced)',
  'agent.modelHaiku': 'Claude Haiku 4.5 (fast)',
  'agent.maxTurns': 'Max Turns',
  'agent.maxTurnsDesc': 'Maximum number of turns Claude can make in a session. 0 = unlimited.',
  'agent.maxTurnsTokenSave': 'token savings',
  'agent.maxTurnsCustom': 'Custom: {{count}} turns',
  'agent.systemPrompt': 'System Prompt',
  'agent.systemPromptDesc': 'Defines the agent\'s expertise and rules. Applied in every session.',
  'agent.systemPromptExample': 'e.g. "You are a Next.js expert. You use TypeScript and write clean code."',
  'agent.systemPromptPlaceholder': 'You are a [field of expertise] expert. You use [technologies]. [rules]...',
  'agent.addAgent': 'Add Agent',

  // Turn profiles
  'agent.turnLight': 'Light (5 turns)',
  'agent.turnNormal': 'Normal (15 turns)',
  'agent.turnHeavy': 'Heavy (30 turns)',
  'agent.turnUnlimited': 'Unlimited',

  // Advanced tab
  'agent.effortLevel': 'Effort Level',
  'agent.effortDesc': 'Low effort saves 60-70% tokens on simple tasks.',
  'agent.effortLow': 'Low',
  'agent.effortMedium': 'Normal',
  'agent.effortHigh': 'High',
  'agent.effortLowDesc': 'Simple tasks — 60-70% token savings',
  'agent.effortMediumDesc': 'Standard tasks',
  'agent.effortHighDesc': 'Complex tasks — most detailed output',

  'agent.toolPermissions': 'Tool Permissions',
  'agent.toolPermissionsDesc': 'Restrict which tools the agent can use. Empty = full access.',
  'agent.permSafe': 'Safe (Read Only)',
  'agent.permDeveloper': 'Developer',
  'agent.permFull': 'Full Access',
  'agent.allowedTools': 'Allowed (empty = all)',
  'agent.disallowedTools': 'Blocked',

  'agent.envVars': 'Environment Variables',
  'agent.envVarsDesc': 'Custom env variables for agent sessions. Sensitive values are masked.',

  'agent.appendSystemPrompt': 'Additional Instructions',
  'agent.appendSystemPromptLabel': 'append system prompt',
  'agent.appendSystemPromptDesc': 'Appended to the system prompt when starting a session. Does not modify the main prompt.',
  'agent.appendSystemPromptPlaceholder': 'Additional instructions...\ne.g. Write tests before modifying any file. Use TypeScript strict mode.',

  'agent.promptFile': 'Prompt File',
  'agent.promptFileLabel': '--system-prompt-file',
  'agent.promptFileDesc': 'Loads system prompt from a file path. Absolute or relative to working directory.',
  'agent.promptFilePlaceholder': 'e.g. .claude/prompts/backend.md or C:\\prompts\\agent.md',

  'agent.promptTemplates': 'Prompt Templates',
  'agent.promptTemplatesDesc': 'You can use variables in system prompt and additional instructions:',

  'agent.outputSchema': 'Output Schema',
  'agent.outputSchemaLabel': 'JSON Schema',
  'agent.outputSchemaDesc': 'Requests the agent to format its response according to this JSON schema. Empty = free format.',
  'agent.validJson': 'Valid JSON',
  'agent.invalidJson': 'Invalid JSON',

  // Session tab
  'agent.sessionActive': 'Session Active',
  'agent.sessionNone': 'No Session',
  'agent.stopSession': 'Stop Session',
  'agent.startSession': 'Start New Session',
  'agent.startSessionButton': 'Start Claude Session',
  'agent.startingSession': 'Starting...',
  'agent.workDir': 'Working Directory',
  'agent.selectProject': '— Select project —',
  'agent.manualInput': 'Enter manually',
  'agent.task': 'Task',
  'agent.taskHint': 'What will you tell Claude to do?',
  'agent.assignedTasks': 'Assigned Tasks',
  'agent.taskPlaceholder': 'What do you want the agent to do?\ne.g. Add a dark mode toggle to src/App.tsx',
  'agent.jsonlBind': 'Connect JSONL',
  'agent.scanFiles': 'Scan Files',
  'agent.relativeTimeJustNow': 'just now',
  'agent.relativeTimeMinutes': '{{count}}m ago',
  'agent.relativeTimeHours': '{{count}}h ago',
  'agent.relativeTimeDays': '{{count}}d ago',

  // Skills tab
  'agent.agentSkills': 'Agent Skills ({{count}})',
  'agent.noSkills': 'No skills added yet.',
  'agent.noSkillsHint': 'You can add skills from below.',
  'agent.skillLibrary': 'Skill Library',
  'agent.createSkill': 'Create New',
  'agent.skillMd': 'SKILL.md',
  'agent.skillGitHub': 'GitHub',
  'agent.skillNamePlaceholder': 'Skill name (e.g. tdd, code-review, changelog)',
  'agent.skillDescPlaceholder': 'Short description — when should Claude use this?',
  'agent.skillContentPlaceholder': 'Skill instructions (markdown)...\n\n# TDD Skill\n\n## Process\n1. Write test first\n2. Run test (red)\n3. Write minimal code\n4. Run test (green)\n5. Refactor',
  'agent.createSkillButton': 'Create Skill',
  'agent.skillImportDesc': 'Paste SKILL.md content with YAML frontmatter:',
  'agent.importButton': 'Import',
  'agent.ghImportDesc': 'Bulk download all SKILL.md files from a GitHub repo:',
  'agent.ghBranchPlaceholder': 'Branch (default: main)',
  'agent.ghPathPlaceholder': 'Path filter (e.g. skills/)',
  'agent.ghDownloading': 'Downloading...',
  'agent.ghDownloadButton': 'Download & Import',
  'agent.ghResultCreated': '{{count}} skills added',
  'agent.ghResultSkipped': '{{count}} skipped (already exist)',
  'agent.ghResultErrors': '{{count}} errors',
  'agent.ghMoreErrors': '...and {{count}} more errors',

  // MCP tab
  'agent.agentMcpServers': 'Agent MCP Servers ({{count}})',
  'agent.noMcpServers': 'No MCP server connected yet.',
  'agent.noMcpServersHint': 'You can add servers from below.',
  'agent.mcpConnected': 'Connected',
  'agent.mcpError': 'Error',
  'agent.mcpDisabled': 'Disabled',
  'agent.mcpConnectionTest': 'Connection test',
  'agent.existingServers': 'Existing Servers',
  'agent.newMcpServer': '+ New MCP Server',
  'agent.readyServer': 'Ready Server',
  'agent.mcpServerTitle': 'New MCP Server',
  'agent.mcpName': 'Name',
  'agent.mcpTransport': 'Transport',
  'agent.mcpDescription': 'Description',
  'agent.mcpCommand': 'Command',
  'agent.mcpUrl': 'URL',
  'agent.mcpArgs': 'Arguments',
  'agent.mcpArgsHint': 'space-separated',
  'agent.mcpEnvVars': 'Environment Variables',
  'agent.mcpDeleteServer': 'Delete server',
  'agent.mcpNamePlaceholder': 'e.g. GitHub',
  'agent.mcpDescPlaceholder': 'e.g. GitHub API — repo, issue, PR management',
  'agent.mcpCommandPlaceholder': 'e.g. npx -y @modelcontextprotocol/server-github',
  'agent.mcpUrlPlaceholder': 'e.g. http://localhost:8080/sse',
  'agent.mcpArgsPlaceholder': 'e.g. --db-path /path/to/db.sqlite',
  'agent.skillImportPlaceholder': "---\nname: my-skill\ndescription: This skill ...\n---\n\n# Instructions\n\n1. Step one\n2. Step two",

  // Subagent tab
  'agent.subagentProfile': 'Subagent Profile',
  'agent.boundSubagent': 'Bound subagent',
  'agent.noSubagentBound': 'No subagent profile bound yet',
  'agent.existingSubagents': 'Existing Subagents',
  'agent.noSubagents': 'No subagents yet',
  'agent.newSubagent': '+ New Subagent',
  'agent.readyTemplate': 'Ready Template',
  'agent.exportProfile': 'Export Profile',
  'agent.exportProfileTitle': 'Create subagent from this agent\'s settings',
  'agent.subagentTitle': 'New Subagent',
  'agent.subagentName': 'Name',
  'agent.subagentModel': 'Model (optional)',
  'agent.subagentDescription': 'Description',
  'agent.subagentPrompt': 'Prompt (Instructions)',
  'agent.subagentMaxTurns': 'Max Turns',
  'agent.subagentScope': 'Scope',
  'agent.scopeProject': 'Project (.claude/agents/)',
  'agent.scopeUser': 'User (~/.claude/agents/)',
  'agent.subagentAllowedTools': 'Allowed Tools',

  // Transcript tab
  'agent.transcript': 'Conversation Transcript',
  'agent.noTranscript': 'No JSONL file connected for this agent.',
  'agent.noTranscriptHint': 'Connect a file from the Claude Code tab.',
  'agent.transcriptEmpty': 'Transcript is empty or unreadable.',
  'agent.transcriptInit': 'Initialization',
  'agent.transcriptTools': 'Tools: {{tools}}',

  // ============================================================
  // Project — ProjectPanel.tsx
  // ============================================================
  'project.title': 'Projects',
  'project.new': '+ New',
  'project.namePlaceholder': 'Project name...',
  'project.dirPlaceholder': 'Folder path (optional): d:\\myprojects\\project-name',
  'project.noProject': 'No project',
  'project.noProjectHint': 'Create a new project from above.',
  'project.deleteProject': 'Delete project',
  'project.addDirHint': 'Add folder path...',

  // Run project
  'project.startProject': 'Start Project — Run All Agents',
  'project.starting': 'Starting...',
  'project.addDirFirst': 'Add a folder path first',
  'project.startAllTitle': 'Start all assigned tasks',
  'project.noTasksToStart': 'No tasks to start. Assign agents to tasks.',
  'project.startedResult': '{{started}}/{{total}} agents started working!',
  'project.taskStartedResult': '"{{desc}}..." started',

  // PM planning
  'project.planWithPm': 'Auto-Plan with PM',
  'project.pmThinking': 'PM is thinking...',
  'project.planWithClaude': 'Plan with Claude',
  'project.pmContextPlaceholder': 'Additional context (optional): tech stack, requirements, priorities...',
  'project.pmCreated': 'PM created: {{count}} tasks',
  'project.pmError': 'PM error: {{message}}',
  'project.addAgentsFirst': 'Add agents first',
  'project.pmPlanTitle': 'Create task plan with Claude',

  // Progress
  'project.progress': 'Progress',

  // Workflow settings
  'project.workflowSettings': 'Workflow Settings',
  'project.workflowMode': 'Workflow Mode',
  'project.workflowFree': 'Free — Agents work independently',
  'project.workflowCoordinated': 'Coordinated — PM agent manages',
  'project.workflowTeam': 'Team — Works with Claude Agent Teams',
  'project.pmAgent': 'PM Agent',
  'project.pmNotAssigned': 'No PM assigned',
  'project.approvalPolicy': 'Approval Policy',
  'project.approvalAuto': 'Automatic — No approval required',
  'project.approvalUser': 'Ask User — Every approval request comes to you',
  'project.approvalPm': 'Ask PM — PM agent decides',
  'project.errorPolicy': 'Error Policy',
  'project.errorStop': 'Stop — Agent stops on error',
  'project.errorNotifyPm': 'Notify PM — Error report sent to PM agent',
  'project.errorAutoRetry': 'Auto Retry',
  'project.contextMode': 'Context Mode',
  'project.contextModeSave': 'token savings',
  'project.contextFull': 'Full — All completed tasks given as context',
  'project.contextCompact': 'Compact — Last 3 tasks + summary (token-efficient)',
  'project.contextMinimal': 'Minimal — Only "N/M tasks completed" (most efficient)',
  'project.claudeMd': 'CLAUDE.md',
  'project.claudeMdLabel': 'project rules',
  'project.claudeMdDesc': 'Written to project folder, automatically read in Claude sessions. Keep system prompt short, write rules here.',
  'project.claudeMdPlaceholder': '# Project Rules\n\n- Use TypeScript\n- Write tests\n- English commit messages',
  'project.extraInstructions': 'Additional Instructions',
  'project.extraInstructionsLabel': 'shared by all agents',
  'project.extraInstructionsDesc': 'Automatically appended to all agents\' system prompts in this project. You can use template variables: {{agent.name}}, {{project.name}}, {{date}} etc.',

  // Hooks
  'project.hooks': 'Hooks',
  'project.hooksActive': '{{count}} active',
  'project.noHooks': 'No hooks defined yet',
  'project.newHook': '+ New Hook',
  'project.hookEvent': 'Event',
  'project.hookType': 'Type',
  'project.hookMatcher': 'Matcher',
  'project.hookCommand': 'Command',
  'project.hookWebhookUrl': 'Webhook URL',
  'project.hookLlmPrompt': 'LLM Prompt',
  'project.hookLogs': 'Show logs',
  'project.hookNoLogs': 'No execution logs yet',
  'project.hookTemplate': 'Template',

  // Hook event labels
  'hook.PreToolUse': 'Pre Tool Use',
  'hook.PostToolUse': 'Post Tool Use',
  'hook.SessionStart': 'Session Start',
  'hook.SessionStop': 'Session Stop',
  'hook.TaskCompleted': 'Task Completed',
  'hook.TaskFailed': 'Task Failed',
  'hook.SubagentStart': 'Subagent Started',
  'hook.SubagentStop': 'Subagent Stopped',
  'hook.PreCompact': 'Pre Compact',
  'hook.Notification': 'Notification',

  // Hook type labels
  'hook.command': 'Shell Command',
  'hook.http': 'Webhook (HTTP POST)',
  'hook.prompt': 'LLM Evaluation',

  // Worktree isolation
  'project.worktreeIsolation': 'Worktree Isolation',
  'project.worktreeMode': 'Mode:',
  'project.notGitRepo': 'Not a git repo',
  'project.noWorktrees': 'No worktrees yet. They are automatically created when a task starts.',
  'project.worktreeFiles': '{{count}} files',
  'project.worktreeCommits': '{{count}} commits',
  'project.worktreeRefresh': 'Refresh status',
  'project.worktreeMerge': 'Merge',
  'project.worktreeCreate': '+ Create',
  'project.worktreeSelectAgent': 'Select agent...',
  'project.worktreeError': 'Worktree error: {{message}}',
  'project.mergeFailed': 'Merge failed: {{message}}',

  // Teams
  'project.teamMode': 'Team Mode',
  'project.teamCount': '{{count}} teams',
  'project.teamLeader': 'Leader: {{name}}',
  'project.teamAddMember': 'Add member...',
  'project.newTeam': '+ Create New Team',
  'project.teamNamePlaceholder': 'Team name...',
  'project.teamLeadLabel': 'Team Leader (PM)',
  'project.teamLeadSelect': 'Select leader...',
  'project.teamMaxMembers': 'Max Members',
  'project.teamRemoveMember': 'Remove',

  // Tasks
  'project.tasks': 'Tasks',
  'project.noTasks': 'No tasks yet',
  'project.newTask': '+ New Task',
  'project.taskDescPlaceholder': 'Task description...',
  'project.selectAgent': 'Select agent (optional)',
  'project.noAgent': 'No agent',
  'project.dependsOn': 'Must finish first: (optional)',
  'project.blocked': 'Waiting: "{{desc}}..."',
  'project.startTask': 'Start this task',
  'project.deleteTask': 'Delete task',
  'project.editTask': 'Click to edit',
  'project.moveUp': 'Move up',
  'project.moveDown': 'Move down',
  'project.noDependency': 'No dependency',
  'project.blockPrereq': 'First "{{desc}}..." must be completed',

  // ============================================================
  // Template — TemplateModal.tsx
  // ============================================================
  'template.title': 'Ready-Made Team Templates',
  'template.subtitle': 'Add all agents with one click',
  'template.apply': 'Add {{count}} Agents',
  'template.selectFirst': 'Select Template',
  'template.applying': 'Adding...',
  'template.agentsAdded': '{{count}} agents added!',
  'template.error': 'Error: {{message}}',

  // Template names & descriptions
  'template.fullstack.label': 'Full-Stack Team',
  'template.fullstack.desc': 'Frontend, backend and QA agents',
  'template.aiResearch.label': 'AI Research Team',
  'template.aiResearch.desc': 'Research, analysis and development',
  'template.devops.label': 'DevOps Team',
  'template.devops.desc': 'Infrastructure, CI/CD and security',
  'template.startup.label': 'Startup Team',
  'template.startup.desc': 'Small, versatile team',
  'template.content.label': 'Content Team',
  'template.content.desc': 'Content creation and editorial',

  // Template agent roles
  'template.fullstack.frontendRole': 'Frontend Developer',
  'template.fullstack.backendRole': 'Backend Developer',
  'template.fullstack.qaRole': 'QA Engineer',
  'template.aiResearch.researcherRole': 'AI Researcher',
  'template.aiResearch.dataScientistRole': 'Data Scientist',
  'template.aiResearch.mlEngineerRole': 'ML Engineer',
  'template.devops.devopsRole': 'DevOps Engineer',
  'template.devops.securityRole': 'Security Engineer',
  'template.devops.cloudRole': 'Cloud Architect',
  'template.startup.fullstackRole': 'Full-Stack Dev',
  'template.startup.uxRole': 'UX Designer',
  'template.startup.pmRole': 'Project Manager',
  'template.content.writerRole': 'Content Writer',
  'template.content.researcherRole': 'Researcher',
  'template.content.editorRole': 'Editor',

  // Template system prompts
  'template.fullstack.frontend': 'You are a React/TypeScript expert. You use Tailwind CSS and write clean, accessible UIs.',
  'template.fullstack.backend': 'You are a Node.js/Express expert. You are good at REST API and database design.',
  'template.fullstack.qa': 'You are a testing expert. You write Jest, Playwright and e2e tests. You find bugs.',
  'template.aiResearch.researcher': 'You are an AI researcher. You read papers, analyze and create summaries.',
  'template.aiResearch.dataScientist': 'You are a data scientist. You are an expert in Python, pandas and machine learning.',
  'template.aiResearch.mlEngineer': 'You are an ML engineer. You do model training, fine-tuning and deployment.',
  'template.devops.devops': 'You are a DevOps expert. You set up Docker, Kubernetes and CI/CD pipelines.',
  'template.devops.security': 'You are a security expert. You find vulnerabilities and perform security audits.',
  'template.devops.cloud': 'You are a cloud architect. You optimize AWS/Azure/GCP services.',
  'template.startup.fullstack': 'You are a versatile full-stack developer. You build rapid prototypes.',
  'template.startup.ux': 'You are a UX designer. You prioritize user experience, create wireframes and prototypes.',
  'template.startup.pm': 'You are a project manager. You coordinate tasks, set priorities and track progress.',
  'template.content.writer': 'You are a content writer. You write SEO-friendly, fluent and engaging content.',
  'template.content.researcher': 'You are a researcher. You find sources, verify information and create summaries.',
  'template.content.editor': 'You are an editor. You edit texts, check consistency and improve quality.',

  // ============================================================
  // Dashboard — DashboardPanel.tsx
  // ============================================================
  'dashboard.title': 'Dashboard',
  'dashboard.subtitle': '{{name}} — Advanced Monitoring',

  // Tabs
  'dashboard.tabOverview': 'Overview',
  'dashboard.tabCosts': 'Costs',
  'dashboard.tabTools': 'Tools',
  'dashboard.tabAgents': 'Agents',
  'dashboard.tabTimeline': 'Activity',

  // Overview cards
  'dashboard.agent': 'Agent',
  'dashboard.activeLabel': 'Active',
  'dashboard.session': 'Session',
  'dashboard.completedLabel': 'Completed',
  'dashboard.cost': 'Cost',
  'dashboard.allTasks': 'All Tasks',
  'dashboard.completed': '{{count}} completed',
  'dashboard.inProgress': '{{count}} in progress',
  'dashboard.waiting': '{{count}} waiting',
  'dashboard.tokenCostSummary': 'Token & Cost Summary',
  'dashboard.total': 'Total',
  'dashboard.last30Days': 'Last 30 Days — Token Usage',
  'dashboard.noAgents': 'No agents yet',
  'dashboard.noProjects': 'No projects yet',

  // Project card
  'dashboard.projectCompleted': 'Completed',
  'dashboard.projectActive': 'Active',
  'dashboard.projectPlanning': 'Planning',
  'dashboard.projectProgress': 'Progress',
  'dashboard.projectDone': '{{count}} done',
  'dashboard.projectContinue': '{{count}} ongoing',
  'dashboard.projectTotal': '/ {{count}} total',
  'dashboard.projectNoTasks': 'No tasks yet',

  // Costs tab
  'dashboard.totalCost': 'Total Cost',
  'dashboard.agentCost': 'Cost by Agent',
  'dashboard.dailyCostTrend': 'Daily Cost Trend',

  // Tools tab
  'dashboard.toolUsageStats': 'Tool Usage Statistics',
  'dashboard.noToolData': 'No tool usage data yet',
  'dashboard.toolUsageTotal': 'Total: {{count}} tool uses, {{unique}} different tools',

  // Agents tab
  'dashboard.agentSessions': '{{count}} sessions | {{tasks}} tasks',
  'dashboard.avgPerSession': 'Avg/Session',
  'dashboard.efficiency': 'Efficiency',

  // Timeline tab
  'dashboard.recentActivities': 'Recent Activities',
  'dashboard.noActivities': 'No activity yet',

  // Loading states
  'dashboard.loadingData': 'Loading...',

  // ============================================================
  // Session Replay — SessionReplayPanel.tsx
  // ============================================================
  'replay.title': 'Session Replay',
  'replay.subtitle': 'Watch conversation history step by step',
  'replay.agentLabel': 'Agent:',
  'replay.entryCount': '{{current}} / {{total}} entries',
  'replay.resetTitle': 'Go to start',
  'replay.pause': 'Pause',
  'replay.replay': 'Replay',
  'replay.play': 'Play',
  'replay.stepTitle': 'Next step',
  'replay.noJsonl': 'No JSONL connected for this agent. Connect from AgentModal → Claude Code tab.',
  'replay.sessionStarted': 'Session Started',
  'replay.tools': 'Tools: {{tools}}',
  'replay.resultLabel': 'Result',

  // ============================================================
  // Help — HelpPanel.tsx
  // ============================================================
  'help.title': 'User Guide',
  'help.subtitle': 'SmithAgentOffice — All Features',
  'help.footer': 'SmithAgentOffice v1.0 — Claude Code Agent Orchestration Platform',

  // Help sections
  'help.start.title': 'Quick Start',
  'help.agents.title': 'Agent Management',
  'help.projects.title': 'Project & Task Management',
  'help.sessions.title': 'Sessions & Transcript',
  'help.workflow.title': 'Workflow Settings',
  'help.skills.title': 'Skills',
  'help.hooks.title': 'Hooks (Event Automation)',
  'help.mcp.title': 'MCP Server Management',
  'help.subagents.title': 'Subagent Profiles',
  'help.teams.title': 'Team Mode',
  'help.worktree.title': 'Worktree Isolation',
  'help.dashboard.title': 'Dashboard & Monitoring',
  'help.tokenEfficiency.title': 'Token Efficiency',
  'help.tips.title': 'Tips & Best Practices',

  // ============================================================
  // Animal labels — from @smith/types
  // ============================================================
  'animal.bear': 'Bear',
  'animal.fox': 'Fox',
  'animal.raccoon': 'Raccoon',
  'animal.owl': 'Owl',
  'animal.elephant': 'Elephant',
  'animal.octopus': 'Octopus',
  'animal.rabbit': 'Rabbit',
  'animal.squirrel': 'Squirrel',
  'animal.cat': 'Cat',
  'animal.dog': 'Dog',

  // ============================================================
  // Skill categories — from @smith/types
  // ============================================================
  'skill.category.dev': 'Development',
  'skill.category.devops': 'DevOps',
  'skill.category.ai': 'AI / Data',
  'skill.category.testing': 'Testing / QA',
  'skill.category.docs': 'Documentation',
  'skill.category.general': 'General',

  // ============================================================
  // Subagent templates — from @smith/types
  // ============================================================
  'subagent.researcher.name': 'researcher',
  'subagent.researcher.desc': 'Safe Researcher — read-only access',
  'subagent.researcher.prompt': 'You are a safe research agent. Only read files, analyze and report. Never modify files or run commands.',
  'subagent.fastCoder.name': 'fast-coder',
  'subagent.fastCoder.desc': 'Fast Coder — quick coding with Haiku',
  'subagent.fastCoder.prompt': 'You are a fast coding agent. Make short and clear changes. Don\'t explain unnecessarily, just write the code.',
  'subagent.securityAuditor.name': 'security-auditor',
  'subagent.securityAuditor.desc': 'Security Auditor — scan for vulnerabilities',
  'subagent.securityAuditor.prompt': 'You are a security auditor. Search for security vulnerabilities (XSS, SQL injection, OWASP Top 10) in code and report. Never modify files.',
  'subagent.testRunner.name': 'test-runner',
  'subagent.testRunner.desc': 'Test Runner — only runs tests',
  'subagent.testRunner.prompt': 'You are a test runner agent. Run tests, analyze results and report. Only run test commands (npm test, pytest etc.).',

  // ============================================================
  // MCP Server templates — from @smith/types
  // ============================================================
  'mcp.github.desc': 'GitHub API — repo, issue, PR management',
  'mcp.filesystem.desc': 'File system access (specific directory)',
  'mcp.sqlite.desc': 'SQLite database query access',
  'mcp.braveSearch.desc': 'Web search with Brave Search API',
  'mcp.slack.desc': 'Slack channel and message management',

  // ============================================================
  // Hook templates — from @smith/types
  // ============================================================
  'hookTemplate.autoFormat': 'Auto-format after Bash',
  'hookTemplate.prePushTest': 'Test before push',
  'hookTemplate.taskNotify': 'Task completion notification',
  'hookTemplate.blockEnv': 'Block .env file reading',

  // ============================================================
  // Project Complete Modal
  // ============================================================
  'projectComplete.title': 'Project Completed!',
  'projectComplete.tasks': 'Tasks',
  'projectComplete.agents': 'Agents',
  'projectComplete.duration': 'Duration',
  'projectComplete.tokens': 'Tokens',
  'projectComplete.team': 'Contributors',
  'projectComplete.cost': 'Cost',
  'projectComplete.close': 'OK',

  // ============================================================
  // Training — TrainingPanel.tsx & AgentModal training tab
  // ============================================================
  'training.title': 'Agent Training',
  'training.profiles': 'Training Profiles',
  'training.newProfile': 'New Training',
  'training.profileName': 'Profile Name',
  'training.projectMode': 'Project Analysis',
  'training.techMode': 'Technology Training',
  'training.projectPath': 'Project Directory (full path)',
  'training.techName': 'Technology Name (e.g., Next.js, .NET Core)',
  'training.description': 'Coach Instructions',
  'training.startTraining': 'Start Training',
  'training.retrain': 'Retrain',
  'training.status.pending': 'Pending',
  'training.status.analyzing': 'Analyzing',
  'training.status.generating': 'Generating',
  'training.status.done': 'Complete',
  'training.status.error': 'Error',
  'training.assignToAgent': 'Assign to Agent',
  'training.assignedProfile': 'Assigned Profile',
  'training.removeFromAgent': 'Remove Profile',
  'training.preview': 'Preview',
  'training.noProfiles': 'No training profiles yet',
  'training.selectProfile': 'Select a profile',
  'training.clickStart': 'Click start to begin training',
  'training.confirmDelete': 'Are you sure you want to delete this training profile?',
  'training.delete': 'Delete',
  'training.export': 'Export',
  'training.import': 'Import',
  'training.importError': 'Invalid training profile file. Please select a valid JSON export.',
  'training.cancel': 'Cancel',
  'training.create': 'Create',
  'training.coach': 'Training Coach',
  'training.importGithub': 'Import from GitHub',
  'training.importMd': 'Upload MD Files',
  'training.githubUrl': 'GitHub URL (repo folder or single file)',
  'training.fetch': 'Fetch',
  'training.importSuccess': '{count} profiles created',
  'training.importing': 'Importing...',
}

export default translations
