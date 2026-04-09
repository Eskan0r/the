export interface OutputLine {
  text: string
  type?: 'default' | 'error' | 'warn' | 'accent' | 'secondary' | 'raw'
}

export interface TerminalContext {
  cwd: string
  setCwd: (dir: string) => void
  pageLoadTime: number
}

export type CommandHandler = (args: string, ctx: TerminalContext) => OutputLine[]

// filesystem
const FS: Record<string, { type: 'dir' | 'file'; content?: string }> = {
  'projects': { type: 'dir' },
  'scam.exe': {
    type: 'file',
    content: `
      We really opened the scam.exe file huh. What did you expect to find? 
      You are lucky this isn't a real virus, because if it were, it would have infected your computer by now. 
      Instead, you find this message, which is a reminder that not everything on the internet is safe.
      Lock in twin.
    `,
  },
  'resume.pdf': { type: 'file' },
  '.hidden': { type: 'dir' },
}

function uptime(pageLoadTime: number): string {
  const secs = Math.floor((Date.now() - pageLoadTime) / 1000)
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// definitions
export const COMMANDS: Record<string, CommandHandler> = {

  history: (_args, _ctx) => {
    return [{ text: 'history is handled by the hook', type: 'secondary' }]
  },

  env: (_args, _ctx) => [
    { text: 'USER=user', type: 'default' },
    { text: 'HOME=/home/user', type: 'default' },
    { text: 'SHELL=/bin/ronakOS', type: 'default' },
    { text: 'TERM=xterm-256color', type: 'default' },
    { text: 'EDITOR=vim', type: 'default' },
    { text: 'LANG=en_US.UTF-8', type: 'default' },
    { text: 'MOOD=caffeinated', type: 'default' },
    { text: 'SIDE_PROJECTS=too_many', type: 'default' },
    { text: 'IMPOSTOR_SYNDROME=1', type: 'default' },
    { text: 'PATH=/usr/local/bin:/usr/bin:/bin', type: 'default' },
  ],

  uptime: (_args, ctx) => [
    { text: `up ${uptime(ctx.pageLoadTime)},  1 user,  load average: 0.42, 0.38, 0.31`, type: 'default' },
  ],

  hostname: (_args, _ctx) => [
    { text: 'portfolio', type: 'default' },
  ],

  id: (_args, _ctx) => [
    { text: 'uid=1000(user) gid=1000(user) groups=1000(user),998(wheel),970(docker)', type: 'default' },
  ],

  which: (args, _ctx) => {
    const cmd = args.trim()
    if (!cmd) return [{ text: 'usage: which [command]', type: 'secondary' }]
    if (COMMANDS[cmd] || BLOCKED_COMMAND_NAMES.includes(cmd)) {
      return [{ text: `/usr/bin/${cmd}`, type: 'default' }]
    }
    return [{ text: `which: no ${cmd} in (/usr/local/bin:/usr/bin:/bin)`, type: 'error' }]
  },

  man: (args, _ctx) => {
    const cmd = args.trim()
    const pages: Record<string, string> = {
      help: 'help - list available commands',
      whoami: 'whoami - print current user description',
      ls: 'ls - list directory contents. flags: -la',
      cd: 'cd - change working directory',
      cat: 'cat - concatenate and print files',
      pwd: 'pwd - print working directory',
      echo: 'echo - print arguments to stdout',
      clear: 'clear - clear the terminal screen',
      date: 'date - print current date and time',
      uname: 'uname - print system information. flags: -a',
      neofetch: 'neofetch - system info with ASCII art',
      history: 'history - print command history for this session',
      env: 'env - print environment variables',
      uptime: 'uptime - show how long the system has been running',
      which: 'which - locate a command',
      ps: 'ps - report process status. flags: aux',
      df: 'df - report filesystem disk usage. flags: -h',
      free: 'free - display memory usage. flags: -h',
      skills: 'skills - display technical skills',
      links: 'links - display contact and social links',
      contact: 'contact - alias for links',
      ping: 'ping - send ICMP echo requests to a host',
      git: 'git - the stupid content tracker',
      fortune: 'fortune - print a random quote',
      cowsay: 'cowsay - cow says a thing',
      sl: 'sl - steam locomotive',
    }
    if (!cmd) return [{ text: 'usage: man [command]', type: 'secondary' }]
    const entry = pages[cmd]
    if (!entry) return [{ text: `No manual entry for ${cmd}`, type: 'error' }]
    return [
      { text: `NAME`, type: 'accent' },
      { text: `    ${entry}`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `SYNOPSIS`, type: 'accent' },
      { text: `    ${cmd} [args]`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `(this is ronakOS, not a real man page)`, type: 'secondary' },
    ]
  },

  'ps': (args, ctx) => {
    if (!args.trim().match(/^(aux|ax|-aux)?$/)) {
      return [{ text: 'usage: ps aux', type: 'secondary' }]
    }
    const up = uptime(ctx.pageLoadTime)
    return [
      { text: `USER         PID  %CPU  %MEM  COMMAND`, type: 'secondary' },
      { text: `root           1   0.0   0.1  /sbin/init`, type: 'default' },
      { text: `root          42   0.0   0.2  /usr/lib/systemd/systemd-journald`, type: 'default' },
      { text: `user         137   2.4   8.1  portfolioBrowser --renderer`, type: 'default' },
      { text: `user         613   0.1   1.2  musicPlayer`, type: 'default' },
      { text: `user        1337   0.0   0.0  creativeBlock.daemon [sleeping]`, type: 'default' },
      { text: `user        2048   0.3   3.4  vscode --extension-host`, type: 'default' },
      { text: `user        3141   0.0   0.0  zombieProject.sh [zombie]`, type: 'default' },
      { text: `user        4200   0.0   0.1  ronakOS (uptime: ${up})`, type: 'default' },
      { text: `user        9000   0.0   0.0  impostor_syndrome [cannot kill]`, type: 'default' },
      { text: `root        9999   0.0   0.0  [kworker/0:0]`, type: 'secondary' },
    ]
  },

  df: (args, _ctx) => {
    const h = args.includes('-h') || args.includes('h')
    const unit = h ? 'human' : 'bytes'
    void unit
    return [
      { text: `Filesystem       Size   Used  Avail  Use%  Mounted on`, type: 'secondary' },
      { text: `/dev/sda1         50G    31G    19G   62%  /`, type: 'default' },
      { text: `/dev/sda2        200G   147G    53G   74%  /home`, type: 'default' },
      { text: `tmpfs            16G    1.2G    15G    8%  /tmp`, type: 'default' },
      { text: `portfoliofs      ∞      —      ∞     —    /imagination`, type: 'default' },
    ]
  },

  free: (_args, _ctx) => [
    { text: `               total      used      free    shared   buff/cache   available`, type: 'secondary' },
    { text: `Mem:           32768      9842      8201       412        14724       21901`, type: 'default' },
    { text: `Swap:           8192       103      8089`, type: 'default' },
  ],

  skills: (_args, _ctx) => [
    { text: 'Languages', type: 'accent' },
    { text: '  TypeScript  JavaScript  SQL  Bash Terraform  Python  Go  C [# | ++]  Java', type: 'default' },
    { text: '', type: 'default' },
    { text: 'Frontend', type: 'accent' },
    { text: '  React  Angular  Next.js  Tailwind  Vite', type: 'default' },
    { text: '', type: 'default' },
    { text: 'Backend', type: 'accent' },
    { text: '  Node.js  Express  FastAPI  PostgreSQL  Redis  Kafka  WebSockets  MongoDB', type: 'default' },
    { text: '', type: 'default' },
    { text: 'Infra / Tools', type: 'accent' },
    { text: '  Docker  Linux  AWS [ROSA | S3 | Lambda | DynamoDB | EC2]  API Gateway  Route53  Kubernetes  Git  Postman', type: 'default' },
    { text: '', type: 'default' },
    { text: 'Security', type: 'accent' },
    { text: '  Cisco  Wireshark  Splunk', type: 'default' },
  ],

  links: (_args, _ctx) => [
    // TODO: replace with real URLs
    { text: 'GitHub', type: 'accent' },
    { text: '  https://github.com/Eskan0r', type: 'default' },
    { text: '', type: 'default' },
    { text: 'LinkedIn', type: 'accent' },
    { text: '  https://www.linkedin.com/in/ronak-chavva-48b318262/', type: 'default' },
    { text: '', type: 'default' },
    { text: 'Email', type: 'accent' },
    { text: '  ronakch8@gmail.com', type: 'default' },
  ],

  contact: (args, ctx) => COMMANDS.links(args, ctx),

  ping: (args, _ctx) => {
    const host = args.trim() || 'localhost'
    const ms = () => (Math.random() * 20 + 1).toFixed(3)
    return [
      { text: ``, type: 'default' },
      { text: `Pinging ${host} with 32 bytes of data:`, type: 'default' },
      { text: `Reply from ${host}: bytes=32 time=${ms()} ms ttl=115`, type: 'default' },
      { text: `Reply from ${host}: bytes=32 time=${ms()} ms ttl=115`, type: 'default' },
      { text: `Reply from ${host}: bytes=32 time=${ms()} ms ttl=115`, type: 'default' },
      { text: `Reply from ${host}: bytes=32 time=${ms()} ms ttl=115`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `Ping statistics for ${host}:`, type: 'default' },
      { text: `    Packets: Sent = 4, Recieved = 4, Lost = 0 (0% loss),`, type: 'default' },
      { text: `Approximate round trip times in milli-seconds:`, type: 'default' },
      { text: `    Minimum = ${ms()} ms, Maximum = ${ms()} ms, Average = ${ms()} ms`, type: 'default' },
      { text: ``, type: 'default' },
    ]
  },

  git: (args, _ctx) => {
    const sub = args.trim()
    if (sub === 'status') return [
      { text: `On branch main`, type: 'default' },
      { text: `Your branch is up to date with 'origin/main'.`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `nothing to commit, working tree is a website man`, type: 'secondary' },
    ]
    if (sub === 'log' || sub === 'log --oneline') return [
      { text: `\x1b commit f4a3d1e`, type: 'accent' },
      { text: `    finally fixed that bug that was "almost done" for 2 weeks`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `commit b8c2a09`, type: 'accent' },
      { text: `    add portfolio OS — it's a whole thing`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `commit 9d31f77`, type: 'accent' },
      { text: `    WIP (this commit is a lie, it was not a WIP)`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `commit e0a5512`, type: 'accent' },
      { text: `    delete node_modules (added back 4 minutes later)`, type: 'default' },
      { text: ``, type: 'default' },
      { text: `commit 0000001`, type: 'accent' },
      { text: `    initial commit`, type: 'default' },
    ]
    if (sub.startsWith('push') || sub.startsWith('commit') || sub.startsWith('add')) {
      return [{ text: `error: remote: read-only filesystem`, type: 'error' }]
    }
    return [
      { text: `usage: git <command>`, type: 'secondary' },
      { text: ``, type: 'default' },
      { text: `available here:`, type: 'secondary' },
      { text: `  git status`, type: 'default' },
      { text: `  git log`, type: 'default' },
    ]
  },

  fortune: (_args, _ctx) => {
    const quotes = [
      // TODO: add personal favorites
      `"Any fool can write code that a computer can understand.\n  Good programmers write code that humans can understand."\n  — Martin Fowler`,
      `"Debugging is twice as hard as writing the code in the first place.\n  Therefore, if you write the code as cleverly as possible,\n  you are, by definition, not smart enough to debug it."\n  — Brian Kernighan`,
      `"First, solve the problem. Then, write the code."\n  — John Johnson`,
      `"It works on my machine."\n  — every developer, always`,
      `"The best time to start was yesterday.\n  The second best time is after this coffee."\n  — unknown`,
      `"There are only two hard things in CS:\n  cache invalidation, naming things, and off-by-one errors."`,
    ]
    const pick = quotes[Math.floor(Math.random() * quotes.length)]
    return pick.split('\n').map((line) => ({ text: line, type: 'default' as const }))
  },

  cowsay: (args, _ctx) => {
    const msg = args.trim() || 'moo'
    const bar = '-'.repeat(msg.length + 2)
    return [
      { text: ` ${bar}`, type: 'default' },
      { text: `< ${msg} >`, type: 'default' },
      { text: ` ${bar}`, type: 'default' },
      { text: `        \\   ^__^`, type: 'accent' },
      { text: `         \\  (oo)\\_______`, type: 'accent' },
      { text: `            (__)\\       )\\/\\`, type: 'accent' },
      { text: `                ||----w |`, type: 'accent' },
      { text: `                ||     ||`, type: 'accent' },
    ]
  },

  sl: (_args, _ctx) => [
    { text: `                                       (  ) (@@) ( )  (@)  ()    @@    O     @     O     @      O`, type: 'accent' },
    { text: `                                  (@@@)`, type: 'accent' },
    { text: `              ====        ________                ___________`, type: 'default' },
    { text: `          _D _|  |_______/        \\__I_I_____===__|_________|`, type: 'default' },
    { text: `           |(_)---  |   H\\________/ |   |        =|___ ___|`, type: 'default' },
    { text: `           /     |  |   H  |  |     |   |         ||_| |_||`, type: 'default' },
    { text: `          |      |  |   H  |__--------------------| [___] |`, type: 'default' },
    { text: `          | ________|___H__/__|_____/[][]~\\_______|       |`, type: 'default' },
    { text: `          |/ |   |-----------I_____I [][] []  D   |=======|__`, type: 'default' },
    { text: `        __/ =| o |=-~~\\  /~~\\  /~~\\  /~~\\ ____Y___________|__`, type: 'default' },
    { text: `       |/-=|___|=O=====O=====O=====O|_____/~\\___/        |`, type: 'default' },
    { text: `        \\_/      \\__/  \\__/  \\__/  \\__/      \\_/`, type: 'default' },
    { text: ``, type: 'default' },
    { text: `you typed 'sl' didn't you`, type: 'secondary' },
  ],

  sudo: (args, _ctx) => {
    if (!args.trim()) return [{ text: 'usage: sudo [command]', type: 'secondary' }]
    return [
      { text: `[sudo] password for user: `, type: 'default' },
      { text: `user is not in the sudoers file. This incident will be reported.`, type: 'error' },
    ]
  },

  help: (_args, _ctx) => [
    { text: 'Available commands:', type: 'secondary' },
    { text: '' },
    { text: `  ${'help'.padEnd(14)} show this message`, type: 'default' },
    { text: `  ${'whoami'.padEnd(14)} about the person behind this`, type: 'default' },
    { text: `  ${'ls'.padEnd(14)} list directory contents`, type: 'default' },
    { text: `  ${'cd [dir]'.padEnd(14)} change directory`, type: 'default' },
    { text: `  ${'cat [file]'.padEnd(14)} read a file`, type: 'default' },
    { text: `  ${'pwd'.padEnd(14)} print working directory`, type: 'default' },
    { text: `  ${'echo [text]'.padEnd(14)} print text`, type: 'default' },
    { text: `  ${'clear'.padEnd(14)} clear the terminal`, type: 'default' },
    { text: `  ${'date'.padEnd(14)} current date and time`, type: 'default' },
    { text: `  ${'uname -a'.padEnd(14)} system information`, type: 'default' },
    { text: `  ${'neofetch'.padEnd(14)} system info, but make it art`, type: 'default' },
    { text: '' },
    { text: 'There may be more to discover.', type: 'secondary' },
  ],

  whoami: (_args, _ctx) => [
    // TODO: replace with real bio
    { text: 'Full-stack developer. Into security and ML.', type: 'default' },
    { text: "Building things that work and look like they do.", type: 'default' },
    { text: '' },
    { text: "Type 'help' to explore.", type: 'secondary' },
  ],

  ls: (args, ctx) => {
    const flag = args.trim()
    if (flag === '-la' || flag === '-al' || flag === '-a') {
      const now = new Date()
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: '2-digit' })
      return [
        { text: `total 48`, type: 'secondary' },
        { text: `drwxr-xr-x  5 user user 4096 ${dateStr} <span class="nf-val">.</span>`, type: 'raw' },
        { text: `drwxr-xr-x  3 user user 4096 ${dateStr} <span class="nf-sep">..</span>`, type: 'raw' },
        { text: `drwxr-xr-x  2 user user 4096 ${dateStr} <span class="nf-sep">.hidden/</span>`, type: 'raw' },
        { text: `-rw-r--r--  1 user user 1024 ${dateStr} <span class="nf-val">about.txt</span>`, type: 'raw' },
        { text: `drwxr-xr-x  4 user user 4096 ${dateStr} <span class="nf-logo">projects/</span>`, type: 'raw' },
        { text: `-rw-r--r--  1 user user 8192 ${dateStr} <span class="nf-val">resume.pdf</span>`, type: 'raw' },
      ]
    }

    // regular ls — no dotfiles
    const cwd = ctx.cwd
    if (cwd === '~/projects' || cwd === 'projects') {
      return [
        { text: `<span class="nf-val">coming-soon/</span>`, type: 'raw' },
      ]
    }

    return [
      {
        text: `<span class="nf-logo">projects/</span>    <span class="nf-val">about.txt</span>    <span class="nf-val">resume.pdf</span>`,
        type: 'raw',
      },
    ]
  },

  cd: (args, ctx) => {
    const dir = args.trim().replace(/\/$/, '')
    const valid: Record<string, string> = {
      'projects': '~/projects',
      '~/projects': '~/projects',
      '~': '~',
      '': '~',
      '..': '~',
      '/home/user': '~',
    }
    if (dir in valid) {
      ctx.setCwd(valid[dir])
      return []
    }
    return [{ text: `bash: cd: ${dir}: No such file or directory`, type: 'error' }]
  },

  cat: (args, _ctx) => {
    const file = args.trim()
    if (file === 'about.txt') {
      const entry = FS['about.txt']
      return (entry.content ?? '').split('\n').map((line) => ({
        text: line,
        type: 'default' as const,
      }))
    }
    if (file === 'resume.pdf') {
      return [
        { text: '[binary file — not renderable here]', type: 'warn' },
        { text: 'Hint: a downloadable version is coming. Check back soon.', type: 'secondary' },
      ]
    }
    if (!file) {
      return [{ text: 'usage: cat [file]', type: 'secondary' }]
    }
    return [{ text: `cat: ${file}: No such file or directory`, type: 'error' }]
  },

  pwd: (_args, ctx) => [
    { text: ctx.cwd === '~' ? '/home/user' : `/home/user/${ctx.cwd.replace('~/', '')}`, type: 'default' },
  ],

  echo: (args, _ctx) => {
    const text = args.replace(/^['"]|['"]$/g, '')
    return [{ text, type: 'default' }]
  },

  clear: (_args, _ctx) => {
    return [{ text: '__CLEAR__', type: 'default' }]
  },

  date: (_args, _ctx) => [
    { text: new Date().toString(), type: 'default' },
  ],

  'uname': (args, _ctx) => {
    if (args.trim() === '-a') {
      return [{ text: 'Linux portfolio 6.6.0-arch1 #1 SMP PREEMPT x86_64 GNU/Linux', type: 'default' }]
    }
    return [{ text: 'Linux', type: 'default' }]
  },

  neofetch: (_args, ctx) => {
    const up = uptime(ctx.pageLoadTime)
    const logo = [
      '  _____     ',
      ' |  __ \\   ',
      ' | |__) |   ',
      ' |  _  /    ',
      ' | | \\ \\  ',
      ' |_|  \\_\\ '
    ]
    const info = [
      ['user', '<span class="nf-logo">user</span><span class="nf-sep">@</span><span class="nf-logo">portfolio</span>'],
      ['', '<span class="nf-sep">──────────────────</span>'],
      ['OS', 'RonakOS 1.0.0 LTS x86_64'],
      ['Kernel', '6.6.0-arch1'],
      ['Uptime', up],
      ['Shell', 'chudminal 1.0'],
      ['Terminal', 'RonakOS'],
      ['CPU', 'Intel Core i7-8550U (4) @ 1.800GHz'],
      ['Memory', '3072MiB / 32768MiB'],
      ['', ''],
      ['', '<span style="color:#ff5555">●</span> <span style="color:#ffaa00">●</span> <span style="color:#44ff88">●</span> <span style="color:#00ff88">●</span> <span style="color:#888888">●</span> <span style="color:#e8e8e8">●</span>'],
    ]

    const lines: OutputLine[] = []
    const maxRows = Math.max(logo.length, info.length)
    for (let i = 0; i < maxRows; i++) {
      const logoCol = logo[i] ?? '               '
      const infoRow = info[i]
      let infoText = ''
      if (infoRow) {
        const [key, val] = infoRow
        if (key) {
          infoText = `<span class="nf-key">${key}</span><span class="nf-sep">: </span><span class="nf-val">${val}</span>`
        } else {
          infoText = val
        }
      }
      lines.push({
        text: `<span class="nf-logo">${logoCol}</span>  ${infoText}`,
        type: 'raw',
      })
    }
    return lines
  },

  pfetch: (args, ctx) => COMMANDS.neofetch(args, ctx),
}

export const BLOCKED_COMMAND_NAMES = [
  'vim', 'vi', 'nano', 'emacs', 'touch', 'mkdir', 'rm', 'rmdir',
  'mv', 'cp', 'chmod', 'chown', 'chgrp', 'ln', 'apt', 'apt-get',
  'pacman', 'yum', 'brew', 'pip', 'npm', 'su', 'passwd', 'useradd',
  'kill', 'killall', 'reboot', 'shutdown', 'halt', 'dd', 'mkfs',
]

BLOCKED_COMMAND_NAMES.forEach((cmd) => {
  COMMANDS[cmd] = (_args, _ctx) => [
    { text: `bash: ${cmd}: Permission denied (read-only filesystem)`, type: 'error' },
  ]
})

/** All command names — used for tab completion */
export const COMMAND_NAMES = Object.keys(COMMANDS)

/** Filesystem entries by directory — used for tab completion of arguments */
export const FS_COMPLETIONS: Record<string, string[]> = {
  '~': ['projects/', 'about.txt', 'resume.pdf'],
  '~/projects': [],
}

/** Parse raw input into [commandName, argsString] */
export function parseInput(input: string): [string, string] {
  const trimmed = input.trim()
  const spaceIdx = trimmed.indexOf(' ')
  if (spaceIdx === -1) return [trimmed.toLowerCase(), '']
  return [trimmed.slice(0, spaceIdx).toLowerCase(), trimmed.slice(spaceIdx + 1)]
}

/** Run a command string against the registry */
export function runCommand(input: string, ctx: TerminalContext): OutputLine[] {
  const [cmd, args] = parseInput(input)
  if (!cmd) return []
  const handler = COMMANDS[cmd]
  if (!handler) {
    return [{ text: `bash: ${cmd}: command not found`, type: 'error' }]
  }
  return handler(args, ctx)
}
